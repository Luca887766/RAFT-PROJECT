//----------------IMPOSTAZIONI PWA--------------------------
const cacheName = 'RAFTpwa'; //PWA id here

// Register PWA service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log('Service Worker registered successfully');
    }).catch(err => console.error('Service Worker registration failed:', err));
}

// Redirect HTTP to HTTPS
if (location.protocol === "http:") {
    location.href = "https" + location.href.substring(4);
}

// Check for updates
const xhr = new XMLHttpRequest();
xhr.onload = function () {
    const version = xhr.responseText.trim();
    if (!localStorage.pwaversion) {
        localStorage.pwaversion = version;
    } else if (localStorage.pwaversion !== version) {
        console.log("Updating PWA");
        delete localStorage.pwaversion;
        caches.delete(cacheName).then(() => {
            location.reload();
        });
    }
};
xhr.onerror = function () {
    console.log("Update check failed");
};
xhr.open("GET", "pwaversion.txt?t=" + Date.now());
xhr.send();

/*-------------------INTELLIGENZA------------------*/

let webcamRunning = false;
let gestureRecognizer;
let runningMode = "IMAGE";
const videoHeight = 720;
const videoWidth = 1280;
let DrawingUtils;
let GestureRecognizer;

// Disable webcam
const disableCam = () => {
    webcamRunning = false;
    const video = document.getElementById("webcam");
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
    const video = document.getElementById("webcam");
    const canvasElement = document.getElementById("output_canvas");
    const canvasCtx = canvasElement ? canvasElement.getContext("2d") : null;
    const gestureOutput = document.getElementById("gesture_output");
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
            // appendi(categoryName); // Call the appendi function with the recognized gesture
        } else {
            gestureOutput.style.display = "none";
        }
    }

    if (webcamRunning) {
        window.requestAnimationFrame(predictWebcam);
    }
};

// Function to handle appending text
// const appendi = (result_text) => {
//     const gestureOutput = document.getElementById("gesture_output");
//     if (!result_text) {
//         return;
//     }

//     if (result_text === ultimo_valore) {
//         // Do nothing if the same character is entered twice in a row
//     } else if (result_text === "del") {
//         daStampare = daStampare.slice(0, -1); // Delete the last character
//         gestureOutput.innerText = daStampare;
//         ultimo_valore = "del";
//     } else if (result_text === "not" || result_text === "None") {
//         ultimo_valore = ""; // Reset the count
//     } else if (result_text === "space") {
//         daStampare += " ";
//         gestureOutput.innerText = daStampare;
//         ultimo_valore = "space"; // Reset the count
//     } else {
//         daStampare += result_text;
//         ultimo_valore = result_text;
//         gestureOutput.innerText = daStampare;
//     }
// };

document.addEventListener('DOMContentLoaded', async () => {
    const visionLibUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
    const { FilesetResolver, GestureRecognizer: ImportedGestureRecognizer, DrawingUtils: ImportedDrawingUtils } = await import(visionLibUrl);
    DrawingUtils = ImportedDrawingUtils;
    GestureRecognizer = ImportedGestureRecognizer;

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
    };

    const loadGestureRecognizer = async () => {
        await createGestureRecognizer();
        const enableWebcamButton = document.getElementById("enableWebcamButton");
        if (enableWebcamButton) {
            enableWebcamButton.disabled = false;
        }
    };

    // Main logic when window loads
    await loadGestureRecognizer();

    const video = document.getElementById("webcam");
    const canvasElement = document.getElementById("output_canvas");
    const canvasCtx = canvasElement ? canvasElement.getContext("2d") : null;
    const gestureOutput = document.getElementById("gesture_output");

    // Check for webcam support
    const hasGetUserMedia = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    if (!hasGetUserMedia()) {
        console.warn("getUserMedia() is not supported by your browser");
        return;
    }

    // Enable webcam and start predictions
    window.enableCam = async () => {
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
                        document.getElementById("loadingLogo").style.display = "none";
                        document.getElementById("traduzione").style.display = "block";
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

    // Clear gesture output
    window.clearOutput = () => {
        gestureOutput.innerText = "";
        gestureOutput.style.display = "none";
        // daStampare = "";
        // ultimo_valore = "";
        // document.getElementById("gesture_output").innerText = "";
    };

    // Export global functions
    window.disableCam = disableCam;
});

// Slide management
function toSlide(dest) {
    const slides = document.querySelectorAll(".slide");
    slides.forEach((slide) => (slide.style.display = "none"));

    if (dest === "traduzione") {
        const nav = document.getElementById("nav");
        nav.style.display = "none";
        document.getElementById("loadingLogo").style.display = "block";
        enableCam();
    } else {
        disableCam();
    }

    const elementsToShow = getElementsForSlide(dest);
    elementsToShow.forEach((element) => {
        if (element.id === "nav" || element.id === "barraLogo" || element.id === "selezioneLinguaBarra" || element.id === "selModalita" || element.id === "caricamento") {
            element.style.display = "flex";
        } else {
            element.style.display = "block";
        }
    });
}

function getElementsForSlide(dest) {
    const elements = [];
    switch (dest) {
        case "caricamento":
            elements.push(
                document.getElementById("caricamento")
            );
            break;
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

/* ------------------------ VOCABOLARIO ----------------------*/

// Variabile per salvare i dati del vocabolario e caricarli una volta sola
let vocabolario = null;

// Funzione per caricare il vocabolario
function caricaVocabolario() {
    if (vocabolario) {
        return;
    }

    const xhr = new XMLHttpRequest();

    xhr.onload = function () {
        try {
            // Parse del JSON
            vocabolario = JSON.parse(xhr.responseText);
            inizializzaEventi();
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

// Funzione per visualizzare le lettere
function inizializzaEventi() {
    const inputRicerca = document.querySelector('#barraRicerca input');
    const imgContainer = document.querySelector('#imgVocabolario');

    function aggiornaVocabolario() {
        const testo = inputRicerca.value.toUpperCase(); // Converte il testo in maiuscolo

        //controlla se mettere le immagini in fila o in modo alternato
        if (testo.length === 0) {
            imgContainer.classList.add('alternato');
        } else {
            imgContainer.classList.remove('alternato');
        }

        // Logica per ottenere la lingua selezionata dai radio
        const linguaSelezionata = "italiano";

        imgContainer.innerHTML = "";

        //se il campo è vuoto mostra tutte le lettere
        const lettereDaMostrare = testo.length > 0 ? testo.split('') : vocabolario
            .filter(item => item.lingua.includes(linguaSelezionata))
            .map(item => item.lettera);

        console.log(lettereDaMostrare);

        //creo le lettere
        lettereDaMostrare.forEach(char => {
            const div = document.createElement('div');
            div.className = 'lettera';

            const lettera = char === " " ? "SPACE" : char;

            // Cerca nel JSON l'immagine corrispondente
            const elemento = vocabolario.find(item =>
                item.lettera === lettera && item.lingua.includes(linguaSelezionata)
            );

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

    // Call aggiornaVocabolario initially to display all letters by default
    aggiornaVocabolario();

    inputRicerca.addEventListener('input', aggiornaVocabolario);
}

/*----------------- FUNZIONE DELLA SELEZIONE LINGUA ----------------------*/
const container = document.getElementById('selezioneLinguaBarra');
const europeButton = document.querySelector('.lang-btn[data-lang="Europe"]');
const containerRect = container.getBoundingClientRect();
const EUROPE_OFFSET = europeButton ? europeButton.getBoundingClientRect().left - containerRect.left : 20;

document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.lang-btn:not(#noClick)');
    let activeButton = document.querySelector('.lang-btn.active');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            if (button !== activeButton) {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                activeButton = button;

                // Ricalcola la posizione quando cambia il pulsante attivo
                const buttonRect = button.getBoundingClientRect();
                const newOffset = buttonRect.left - container.getBoundingClientRect().left;
                const translateX = EUROPE_OFFSET - newOffset;
                container.style.transform = `translateX(${translateX}px)`;
            }
        });
    });
});



window.toSlide = toSlide;
window.caricaVocabolario = caricaVocabolario;

//----------------------------SELEZIONE MODALITA'--------------------------- 
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("selModalita");
    const cards = document.querySelectorAll(".card");

    let activeCard = document.querySelector(".card.active");
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    cards.forEach((card) => {
        card.addEventListener("mousedown", startDrag);
        card.addEventListener("touchstart", startDrag);
        card.addEventListener("click", () => handleCardClick(card));
    });

    function startDrag(event) {
        isDragging = true;
        startX = event.touches ? event.touches[0].clientX : event.clientX;

        document.addEventListener("mousemove", onDrag);
        document.addEventListener("touchmove", onDrag);
        document.addEventListener("mouseup", stopDrag);
        document.addEventListener("touchend", stopDrag);
    }

    function onDrag(event) {
        if (!isDragging) return;
        currentX = event.touches ? event.touches[0].clientX : event.clientX;

        const deltaX = currentX - startX;

        container.style.transform = `translateX(${deltaX}px)`;
    }

    function stopDrag() {
        isDragging = false;

        document.removeEventListener("mousemove", onDrag);
        document.removeEventListener("touchmove", onDrag);
        document.removeEventListener("mouseup", stopDrag);
        document.removeEventListener("touchend", stopDrag);

        const centerX = window.innerWidth / 2;
        let closestCard = null;
        let closestDistance = Infinity;

        cards.forEach((card) => {
            const cardRect = card.getBoundingClientRect();
            const cardCenter = cardRect.left + cardRect.width / 2;
            const distance = Math.abs(cardCenter - centerX);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestCard = card;
            }
        });

        if (closestCard && closestCard !== activeCard) {
            updateActiveCard(closestCard);
        }

        container.style.transform = "translateX(0)";
    }

    function handleCardClick(card) {
        if (card === activeCard) return;

        if (card.classList.contains("disactive")) {
            card.classList.add("animate");
            setTimeout(() => {
                updateActiveCard(card);
                toSlide('traduzione');
            }, 300); 
        }
    }

    function updateActiveCard(card) {
        if (activeCard) {
            activeCard.classList.remove("active");
            activeCard.classList.add("disactive");
        }

        card.classList.add("active");
        card.classList.remove("disactive");
        activeCard = card;
    }
});




//----------------------------FOOTER---------------------------
document.addEventListener("DOMContentLoaded", () => {
    const navButtons = document.querySelectorAll("#nav button");

    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Rimuovi la classe active da tutti i bottoni
            navButtons.forEach(btn => btn.classList.remove("active"));
            // Aggiungi la classe active al pulsante cliccato
            button.classList.add("active");
        });
    });
});

/*------------------------------ RUOTA LA FRECCIA--------------*/
function toggleFrecciaRotation() {
    const freccia = document.getElementById('freccia');
    freccia.classList.toggle('rotated');
}

/*---------------FUNZIONE PER IL CARICAMENTO INIZIALE--------------*/
//ORA NEL INDEX
function apertura() {
    toSlide("caricamento");
    caricaVocabolario();
    setTimeout(() => {
        toSlide("homePage");
    }, 3000);
}