import {
    GestureRecognizer,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const demosSection = document.getElementById("demos");
let gestureRecognizer;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "720px";
const videoWidth = "1280px";

const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "gesture_recognizer.task",  // Utilizza il file locale
            delegate: "GPU"
        },
        runningMode: runningMode
    });
};

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput = document.getElementById("gesture_output");

// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam(event) {
    if (!gestureRecognizer) {
        alert("Please wait for gestureRecognizer to load");
        return;
    }

    if (webcamRunning === true) {
        webcamRunning = false;
    } else {
        webcamRunning = true;
    }

    // getUsermedia parameters.
    const constraints = {
        video: true
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        if (video) {
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
        } else {
            console.error("Video element not found");
        }
    });
}

function disableCam() {
    webcamRunning = false;
    const video = document.getElementById("webcam");
    if (video && video.srcObject) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();

        tracks.forEach(function(track) {
            track.stop();
        });

        video.srcObject = null;
        video.removeEventListener("loadeddata", predictWebcam);
    }
}

let lastVideoTime = -1;
let results = undefined;
async function predictWebcam() {
    const videoContainer = document.querySelector(".videoContainer");
    canvasElement.width = videoContainer.clientWidth;
    canvasElement.height = videoContainer.clientHeight;

    // Now let's start detecting the stream.
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }
    let nowInMs = Date.now();
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        results = gestureRecognizer.recognizeForVideo(video, nowInMs);
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);

    if (results.landmarks) {
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(
                landmarks,
                GestureRecognizer.HAND_CONNECTIONS,
                {
                    color: "#00FF00",
                    lineWidth: 5
                }
            );
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 2
            });
        }
    }
    canvasCtx.restore();
    if (results.gestures.length > 0) {
        gestureOutput.style.display = "block";
        const categoryName = results.gestures[0][0].categoryName;
        const categoryScore = parseFloat(
            results.gestures[0][0].score * 100
        ).toFixed(2);
        const handedness = results.handednesses[0][0].displayName;
        gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
    } else {
        gestureOutput.style.display = "none";
    }
    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}

function clearOutput() {
    gestureOutput.innerText = "";
    gestureOutput.style.display = "none";
}