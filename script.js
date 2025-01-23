(async () => {
    const visionLibUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
    const { FilesetResolver, GestureRecognizer, DrawingUtils } = await import(visionLibUrl);

    let gestureRecognizer;
    let runningMode = "IMAGE";
    let webcamRunning = false;

    const videoHeight = 720;
    const videoWidth = 1280;

    // Initialize Gesture Recognizer
    const createGestureRecognizer = async () => {
        const vision = await FilesetResolver.forVisionTasks(
            `${visionLibUrl}/wasm`
        );
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "gesture_recognizer.task",
                delegate: "GPU",
            },
            runningMode: runningMode,
        });
        localStorage.setItem('gestureRecognizerLoaded', 'true');
    };

    const loadGestureRecognizer = async () => {
        const storedRecognizerFlag = localStorage.getItem('gestureRecognizerLoaded');
        if (storedRecognizerFlag) {
            await createGestureRecognizer();
        } else {
            await createGestureRecognizer();
        }
    };

    // Main logic when window loads
    window.addEventListener('load', async () => {
        await loadGestureRecognizer();

        const video = document.getElementById("webcam");
        const canvasElement = document.getElementById("output_canvas");
        const canvasCtx = canvasElement ? canvasElement.getContext("2d") : null;
        const gestureOutput = document.getElementById("gesture_output");

        const enableWebcamButton = document.getElementById("webcamButton");

        // Check for webcam support
        const hasGetUserMedia = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

        if (!hasGetUserMedia()) {
            console.warn("getUserMedia() is not supported by your browser");
            return;
        }

        enableWebcamButton?.addEventListener('click', () => {
            if (webcamRunning) {
                disableCam();
            } else {
                enableCam();
            }
        });

        // Enable webcam and start predictions
        const enableCam = async () => {
            if (!gestureRecognizer) {
                alert("Please wait for gestureRecognizer to load");
                return;
            }

            const constraints = { video: { width: videoWidth, height: videoHeight } };
            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (video) {
                    video.srcObject = stream;
                    video.addEventListener("loadeddata", () => {
                        if (video.videoWidth > 0 && video.videoHeight > 0) {
                            predictWebcam();
                            webcamRunning = true;
                        } else {
                            console.error("Video dimensions are not set correctly.");
                        }
                    });
                }
            } catch (err) {
                console.error("Error accessing the webcam: ", err);
            }
        };

        // Disable webcam
        const disableCam = () => {
            webcamRunning = false;
            if (video && video.srcObject) {
                const stream = video.srcObject;
                stream.getTracks().forEach((track) => track.stop());
                video.srcObject = null;
                video.removeEventListener("loadeddata", predictWebcam);
            }
        };

        // Predict gestures from webcam
        let lastVideoTime = -1;
        const predictWebcam = async () => {
            if (!gestureRecognizer || !canvasElement || !canvasCtx || !webcamRunning) return;

            canvasElement.width = video.videoWidth;
            canvasElement.height = video.videoHeight;

            if (runningMode === "IMAGE") {
                runningMode = "VIDEO";
                await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
            }

            const nowInMs = Date.now();
            if (video.currentTime !== lastVideoTime) {
                lastVideoTime = video.currentTime;
                const results = await gestureRecognizer.recognizeForVideo(video, nowInMs);

                canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

                if (results.landmarks) {
                    const drawingUtils = new DrawingUtils(canvasCtx);
                    for (const landmarks of results.landmarks) {
                        drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                            color: "#00FF00",
                            lineWidth: 5,
                        });
                        drawingUtils.drawLandmarks(landmarks, {
                            color: "#FF0000",
                            lineWidth: 2,
                        });
                    }
                }

                if (results.gestures.length > 0) {
                    gestureOutput.style.display = "block";
                    const { categoryName, score } = results.gestures[0][0];
                    const handedness = results.handednesses[0][0].displayName;
                    gestureOutput.innerText = `Gesture: ${categoryName}\nConfidence: ${(score * 100).toFixed(2)}%\nHandedness: ${handedness}`;
                } else {
                    gestureOutput.style.display = "none";
                }
            }

            if (webcamRunning) {
                window.requestAnimationFrame(predictWebcam);
            }
        };

        // Clear gesture output
        const clearOutput = () => {
            gestureOutput.innerText = "";
            gestureOutput.style.display = "none";
        };

        // Export global functions
        window.disableCam = disableCam;
        window.enableCam = enableCam;
        window.clearOutput = clearOutput;
    });
})();

// Slide management
function toSlide(dest) {
    const slides = document.querySelectorAll(".slide");
    slides.forEach((slide) => (slide.style.display = "none"));

    if (dest !== "traduzione") {
        window.disableCam?.();
    } else {
        window.enableCam?.();
    }

    const elementsToShow = getElementsForSlide(dest);
    elementsToShow.forEach((element) => (element.style.display = "block"));
}

function getElementsForSlide(dest) {
    const elements = [];
    switch (dest) {
        case "homePage":
            elements.push(
                document.getElementById("barraLogo"),
                document.getElementById("selezioneLinguaBarra"),
                document.getElementById("selModalita"),
                document.getElementById("nav")
            );
            break;
        case "vocabolario":
            elements.push(
                document.getElementById("barraLogo"),
                document.getElementById("selezioneLinguaBarra"),
                document.getElementById("vocabolario"),
                document.getElementById("nav")
            );
            break;
        case "contatti":
            elements.push(
                document.getElementById("barraLogo"),
                document.getElementById("selezioneLinguaBarra"),
                document.getElementById("contatti"),
                document.getElementById("nav")
            );
            break;
        case "selDifficolta":
            elements.push(
                document.getElementById("barraLogo"),
                document.getElementById("selDifficolta"),
                document.getElementById("nav")
            );
            break;
        case "traduzione":
            elements.push(document.getElementById("traduzione"));
            break;
        case "allenamento":
            elements.push(document.getElementById("allenamento"));
            break;
        default:
            break;
    }
    return elements;
}

// Load vocabulary functionality
function caricaVocabolario() {
    const xhr = new XMLHttpRequest();

    xhr.onload = function () {
        try {
            // Parse del JSON una sola volta
            const data = JSON.parse(xhr.responseText);
            const inputRicerca = document.querySelector('#barraRicerca input');
            const imgContainer = document.querySelector('#imgVocabolario');

            // Funzione per aggiornare il vocabolario
            function aggiornaVocabolario() {
                const testo = inputRicerca.value.toUpperCase(); // Converte il testo in maiuscolo

                // Logica per ottenere la lingua selezionata dai radio
                const linguaSelezionata = "italiano";

                imgContainer.innerHTML = ""; // Pulizia del contenitore

                // Logica per iterare sul testo e cercare le lettere
                [...testo].forEach(char => {
                    // Creazione del contenitore per ogni lettera
                    const div = document.createElement('div');
                    div.className = 'lettera';
                
                    // Gestione dello spazio
                    const lettera = char === " " ? "SPACE" : char;
                
                    // Cerca nel JSON l'immagine corrispondente
                    const elemento = data.find(item =>
                        item.lettera === lettera && item.lingua.includes(linguaSelezionata)
                    );
                
                    // Se trovato, aggiunge gli elementi al contenitore
                    if (elemento) {
                        const img = document.createElement('img');
                        img.src = elemento.img;
                        img.alt = elemento.lettera;
                
                        const titolo = document.createElement('h3');
                        titolo.innerText = elemento.lettera;
                
                        div.appendChild(img);
                        div.appendChild(titolo);
                        imgContainer.appendChild(div);
                    }
                });
            }

            // Evento per aggiornare il vocabolario in tempo reale
            inputRicerca.addEventListener('input', aggiornaVocabolario);
        } catch (e) {
            console.error("Error parsing vocabulary data: ", e);
            document.querySelector('#imgVocabolario').innerText = "Caricamento fallito.";
        }
    };

    xhr.onerror = function () {
        document.querySelector('#imgVocabolario').innerText = "Errore di comunicazione.";
    };

    xhr.open("GET", "vocabolario.json");
    xhr.send();
}

/*----------------- FUNZIONE DELLA SELEZIONE LINGUA ----------------------*/
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.lang-btn');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Rimuove la classe "active" da tutti i pulsanti
            buttons.forEach(btn => btn.classList.remove('active'));
            // Aggiunge la classe "active" al pulsante cliccato
            button.classList.add('active');
        });
    });
});

window.toSlide = toSlide;
window.caricaVocabolario = caricaVocabolario;
