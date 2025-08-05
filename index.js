const OBSWebSocket = require('obs-websocket-js').default;
const cv = require('@techstark/opencv-js');
const Jimp = require('jimp');

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Settings over here
const wsAddress = '127.0.0.1:4455'; // OBS Websocket address
const wsPassword = '123456'; // OBS Websocket password
const obsSource = 'CameraPic'; // OBS Source name
const obsImageWidth = 192; // Checked image resolution width (keep this around 1/10 of the source resolution)
const obsImageHeight = 108; // Checked image resolution width (keep this around 1/10 of the source resolution)
const motionLimit = 20; // How big of a change is needed to trigger motion detection. Higher is less sensitive
const imageInterval = .5; // How often to check for differences in the source image
const avgSize = 10; // Averaging depth
const inactivityTimeout = 300; // Seconds without motion before stopping the stream (e.g., 300s = 5 minutes)
const connectionRetryDelay = 5; // Seconds to wait before retrying to connect to OBS

const debug = true; // Displays standard deviance, current deviance and difference in console if set to true.
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

let avgArr = [];
let motionDetected = false;
let prevImg;
let inactivityTimer = null;

const obs = new OBSWebSocket();

async function connect() {
    try {
        console.log(`Attempting to connect to server ${('ws://' + wsAddress)}...`);
        const {
            obsWebSocketVersion,
            negotiatedRpcVersion
        } = await obs.connect('ws://' + wsAddress, wsPassword, {
            rpcVersion: 1
        });
        console.log(`Successfully connected to server ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`);
        
        // Une fois connecté, on démarre la détection
        setInterval(detection, imageInterval * 1000);

    } catch (error) {
        console.error(`Failed to connect: ${error.message}. Retrying in ${connectionRetryDelay} seconds...`);
        // Si la connexion échoue, on attend avant de réessayer
        setTimeout(connect, connectionRetryDelay * 1000);
    }
}

async function detection() {
    loadImg().then((img) => {
        const diff = processImg(img);
        if (diff !== undefined) {
            avgArr.push(diff);
            if (avgArr.length >= avgSize) {
                if (avgArr.length > avgSize) {
                    avgArr.shift();
                }
                const dev = stdev(avgArr);
                const current = Math.pow(diff - mean(avgArr), 2);
                const currentDev = Math.abs(current - dev);

                if (debug) {
                    console.log(`StdDev: ${dev.toFixed(2)}, Current: ${current.toFixed(2)}, Diff: ${currentDev.toFixed(2)}`);
                }

                // Si un mouvement est détecté
                if (currentDev > motionLimit) {
                    // Si un minuteur d'inactivité était en cours, on le réinitialise
                    if (inactivityTimer) {
                        console.log("Motion detected again. Resetting inactivity timer.");
                        clearTimeout(inactivityTimer);
                        inactivityTimer = null;
                    }

                    // Si le stream n'était pas déjà en cours, on le démarre
                    if (!motionDetected) {
                        console.log("Motion detected. Starting stream. (Magnitude: " + currentDev.toFixed(2) + ")");
                        motionDetected = true;
                        obs.call('StartStream', {});
                    }
                } else { // Si aucun mouvement n'est détecté
                    // Si le stream est en cours et qu'aucun minuteur d'inactivité n'est lancé, on en démarre un
                    if (motionDetected && !inactivityTimer) {
                        console.log(`Motion has stopped. Stopping stream in ${inactivityTimeout} seconds if no new motion is detected.`);
                        inactivityTimer = setTimeout(async () => {
                            await obs.call('StopStream', {});
                            console.log("Stream stopped due to inactivity.");
                            motionDetected = false;
                            inactivityTimer = null;
                            // On vide le tableau pour recalibrer la détection au prochain mouvement
                            avgArr = [];
                        }, inactivityTimeout * 1000);
                    }
                }
            } else {
                console.log(`Accumulating averages (${avgArr.length}/${avgSize})`);
            }
        }
    }, (err) => {
        console.log(err);
    });
}

async function loadImg() {
    return new Promise(async (resolve, reject) => {
        try {
            const img = await obs.call('GetSourceScreenshot', {
                sourceName: obsSource,
                imageFormat: "jpeg",
                imageWidth: obsImageWidth,
                imageHeight: obsImageHeight
            });
            let url = img.imageData.split(',')[1];
            let buffer = Buffer.from(url, 'base64');
            Jimp.read(buffer).then(img => {
                resolve(cv.matFromImageData(img.bitmap));
            }).catch(function (err) {
                reject(err);
            });
        } catch (error) {
            // Rejette la promesse si la capture d'écran échoue (ex: OBS est fermé)
            reject(`Could not get source screenshot: ${error.message}`);
        }
    });
}

function processImg(img) {
    if (!prevImg) {
        prevImg = img;
        return;
    }

    let diff = new cv.Mat();
    cv.absdiff(prevImg, img, diff);

    let sum = 0
    for (row = 0; row < diff.rows; row++) {
        for (col = 0; col < diff.cols; col++) {
            sum += diff.ucharPtr(row, col)[0] + diff.ucharPtr(row, col)[1] + diff.ucharPtr(row, col)[2];
        }
    }

    diff.delete();
    prevImg.delete();

    prevImg = img;
    return sum / (img.rows * img.cols);
}

function stdev(array) {
    const avg = mean(array);
    return Math.sqrt(array.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / array.length);
}

function mean(array) {
    return array.reduce((a, b) => a + b) / array.length;
}

// Lancement initial de la tentative de connexion
connect();
