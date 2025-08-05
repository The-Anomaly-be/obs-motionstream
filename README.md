# OBS Motion Stream

This script allows you to automatically start and stop a stream in OBS Studio based on motion detection in a video source. I used https://github.com/doct0r0710/obs-motion as a base and adapted the main functionality to create a live gaming room concept that activates a stream as soon as someone enters a room to play. You can see the result on my Youtube https://www.youtube.com/@theanomalyBE and Twitch https://www.twitch.tv/theanoma_ly channels. 

## Acknowledgements

This project is a modified version of the original **obs-motion** script created by **Doctor0710**. The initial project's goal was to save the Replay Buffer upon motion detection. You can find explanations of its basic functionality in his [blog post](https://doctor0710.xyz/2023/02/17/obs-motion-detector/).

## How It Works

This script connects to OBS via its WebSocket server to periodically capture frames from a video source of your choice. It analyzes these frames to detect movement.

-   When motion is detected, the script sends a command to OBS to **start the stream**.
-   After a configurable period of inactivity, the script sends a command to **stop the stream**.

## Prerequisites

-   **Node.js** installed on your machine.
-   **OBS Studio** installed and configured with a scene and a video source.
-   The **OBS WebSocket server** must be enabled. To do this:
    1.  In OBS, go to `Tools` -> `WebSocket Server Settings`.
    2.  Check `Enable WebSocket Server`.
    3.  Set a password and take note of it, as well as the server port (default is `4455`).

## Installation

1.  Clone or download this project to your computer.
2.  Open a terminal in the project's folder.
3.  Install the necessary dependencies with the command:
    ```sh
    npm install
    ```

## Script Configuration

Before running the script, you must modify a few variables directly in the `index.js` file.

| Variable              | Description                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `wsAddress`           | The address and port of your OBS WebSocket server (e.g., `'127.0.0.1:4455'`).                                                |
| `wsPassword`          | The password you set for the WebSocket server.                                                                |
| `obsSource`           | The exact name of the video source to monitor in OBS (e.g., `'Camera'`).                                                      |
| `obsImageWidth`       | The width of the captured image for analysis. A low resolution (e.g., 192) is recommended for better performance.     |
| `obsImageHeight`      | The height of the captured image for analysis.                                                                   |
| `motionLimit`         | The sensitivity threshold. Increase this value if the script is too sensitive; decrease it if it doesn't detect enough motion.         |
| `imageInterval`       | The interval in seconds between each image capture. Decrease for faster detection; increase to improve performance. |
| `avgSize`             | The number of frames used to calculate the motion average. Increase if the scene is "noisy" (e.g., rain, digital snow).           |
| `inactivityTimeout`   | The delay in seconds without motion detection before automatically stopping the stream.                                                      |
| `debug`               | Set this to `true` to display live detection values in the console. Very useful for tuning `motionLimit`.                   |
| `connectionRetryDelay`               | Seconds to wait before retrying to connect to OBS.                  |

## Usage

Once the script is configured, run it with the following command:

```sh
npm start
