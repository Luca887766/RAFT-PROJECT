//----------------PWA SETTINGS--------------------------
const cacheName = 'RAFTpwa'; //PWA id here

// Register PWA service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log('Service Worker registered successfully');
    }).catch(err => console.error('Service Worker registration failed:', err));
}

// Redirect HTTP to HTTPS
/*if (location.protocol === "http:") {
    location.href = "https" + location.href.substring(4);
}*/

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

/*-------------------INTELLIGENCE------------------*/

let webcamRunning = false;
let gestureRecognizer;
let runningMode = "IMAGE";
const videoHeight = 720;
const videoWidth = 1280;
let DrawingUtils;
let GestureRecognizer;

let ultimo_valore = "";
let daStampare = "";

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
            //gestureOutput.innerText = `Gesture: ${categoryName}\nConfidence: ${(score * 100).toFixed(2)}%\nHandedness: ${handedness}`;
            if (score > 0.70 && categoryName !== ultimo_valore) {
                appendi(categoryName); // Call the appendi function with the recognized gesture
            }
        } else {
            //gestureOutput.style.display = "none";
        }
    }

    if (webcamRunning) {
        window.requestAnimationFrame(predictWebcam);
    }
};

// Function to handle appending text
let lastAppendTime = 0;
const appendi = (result_text) => {
    const gestureOutput = document.getElementById("gesture_output");
    const currentTime = Date.now();

    if (!result_text) {
        return;
    }

    // if (result_text === ultimo_valore) {
    //     // Do nothing if the same character is entered twice in a row
    // } else 
    if (result_text === "del") {
        daStampare = daStampare.slice(0, -1); 
        gestureOutput.innerText = daStampare;
        ultimo_valore = "del";
    } else if (result_text === "not" || result_text === "None") {
        ultimo_valore = ""; 
    } else if (result_text === "space") {
        daStampare += " ";
        gestureOutput.innerText = daStampare;
        ultimo_valore = "space"; 
    } else {
        if (currentTime - lastAppendTime < 300) { // Adjust the threshold as needed
            daStampare = daStampare.slice(0, -1); // Remove the last character if too quick
        }
        daStampare += result_text;
        ultimo_valore = result_text;
        gestureOutput.innerText = daStampare;
    }

    lastAppendTime = currentTime;
};

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
                        document.getElementById("loadingIntelligenza").style.display = "none";
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
        daStampare = "";
        ultimo_valore = "";
        document.getElementById("gesture_output").innerText = "";
    };

    // Export global functions
    window.disableCam = disableCam;
});

//--------------------------------- SLIDE MANAGEMENT -----------------------------------*/
function toSlide(dest) {
    const slides = document.querySelectorAll(".slide");
    slides.forEach((slide) => (slide.style.display = "none"));

    // Disattiva tutti i bottoni della selezione difficoltà
    const buttons = document.querySelectorAll("#selDifficolta button");
    buttons.forEach(button => button.classList.remove("active"));

    if (dest === "traduzione") {
        const nav = document.getElementById("nav");
        nav.style.display = "none";
        document.getElementById("loadingIntelligenza").style.display = "flex";
        document.getElementById("traduzione").style.display = "none";
        enableCam();
        return
    } else {
        disableCam();
    }

    const elementsToShow = getElementsForSlide(dest);
    elementsToShow.forEach((element) => {
        if (element.id === "nav" || element.id === "barraLogo" || element.id === "selezioneLinguaBarra" || element.id === "selModalita" || element.id === "loadingIntelligenza" || element.id === "loadingIniziale" || element.id === "selDifficolta") {
            element.style.display = "flex";
        } else {
            element.style.display = "block";
        }
    });
}

function getElementsForSlide(dest) {
    const elements = [];
    switch (dest) {
        case "loadingIntelligenza":
            elements.push(
                document.getElementById("loadingIntelligenza")
            );
            break;
        case "loadingIniziale":
            elements.push(
                document.getElementById("loadingIniziale")
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
        case "giocoFacile":
            elements.push(document.getElementById("giocoFacile"));
            break;
        case "giocoMedio":
            elements.push(document.getElementById("giocoMedio"));
            break;
        case "giocoDifficile":
            elements.push(document.getElementById("giocoDifficile"));
            break;
        default:
            break;
    }
    return elements;
}

/* ------------------------ VOCABULARY ----------------------*/

// Variable to save vocabulary data and load it only once
let vocabolario = null;

// Function to load the vocabulary
function caricaVocabolario() {
    if (vocabolario) {
        return;
    }

    const xhr = new XMLHttpRequest();

    xhr.onload = function () {
        try {
            // Parse the JSON
            vocabolario = JSON.parse(xhr.responseText);
            inizializzaEventi();
        } catch (e) {
            console.error("Error parsing vocabulary data: ", e);
            document.querySelector('#imgVocabolario').innerText = "Loading failed.";
        }
    };

    xhr.onerror = function () {
        document.querySelector('#imgVocabolario').innerText = "Communication error.";
    };

    xhr.open("GET", "vocabolario.json");
    xhr.send();
}

// Function to display letters
function inizializzaEventi() {
    const inputRicerca = document.querySelector('#barraRicerca input');
    const imgContainer = document.querySelector('#imgVocabolario');

    function aggiornaVocabolario() {
        const testo = inputRicerca.value.toUpperCase(); // Convert text to uppercase

        // Check whether to display images in a row or alternately
        if (testo.length === 0) {
            imgContainer.classList.add('alternato');
        } else {
            imgContainer.classList.remove('alternato');
        }

        // Logic to get the selected language from the radio buttons
        const linguaSelezionata = "italiano";

        imgContainer.innerHTML = "";

        // If the field is empty, show all letters
        const lettereDaMostrare = testo.length > 0 ? testo.split('') : vocabolario
            .filter(item => item.lingua.includes(linguaSelezionata))
            .map(item => item.lettera);

        console.log(lettereDaMostrare);

        // Create letters
        lettereDaMostrare.forEach(char => {
            const div = document.createElement('div');
            div.className = 'lettera';

            const lettera = char === " " ? "SPACE" : char;

            // Search the JSON for the corresponding image
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

/*----------------- LANGUAGE SELECTION FUNCTION ----------------------*/
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('selezioneLinguaBarra');
    const europeButton = document.querySelector('.lang-btn[data-lang="Europe"]');
    const containerRect = container.getBoundingClientRect();
    const EUROPE_OFFSET = europeButton ? europeButton.getBoundingClientRect().left - containerRect.left : 20;

    // Imposta sempre il div spostandolo del 10% della larghezza dello schermo verso destra
    const screenWidth = window.innerWidth;
    const initialOffset = screenWidth * 0.1;
    container.style.transform = `translateX(${initialOffset}px)`;

    const buttons = document.querySelectorAll('.lang-btn:not(#noClick)');
    let activeButton = document.querySelector('.lang-btn.active');
    let isDragging = false;
    let startX = 0;
    let currentX = 0;

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            if (!isDragging && button !== activeButton) {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                activeButton = button;

                // Ricalcola la posizione quando cambia il pulsante attivo
                const buttonRect = button.getBoundingClientRect();
                const newOffset = buttonRect.left - container.getBoundingClientRect().left;
                const translateX = EUROPE_OFFSET - newOffset + initialOffset;
                container.style.transform = `translateX(${translateX}px)`;
            }
        });

        button.addEventListener('mousedown', startDrag);
        button.addEventListener('touchstart', startDrag);
    });

    function startDrag(event) {
        isDragging = true;
        startX = event.touches ? event.touches[0].clientX : event.clientX;

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    }

    function onDrag(event) {
        if (!isDragging) return;
        currentX = event.touches ? event.touches[0].clientX : event.clientX;

        const deltaX = currentX - startX;
        container.style.transform = `translateX(${initialOffset + deltaX}px)`;
    }

    function stopDrag(event) {
        isDragging = false;

        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);

        let closestInactiveButton = findClosestInactiveButton(event.target);

        if (closestInactiveButton) {
            buttons.forEach(btn => btn.classList.remove('active'));
            closestInactiveButton.classList.add('active');
            activeButton = closestInactiveButton;

            const buttonRect = closestInactiveButton.getBoundingClientRect();
            const newOffset = buttonRect.left - container.getBoundingClientRect().left;
            const translateX = EUROPE_OFFSET - newOffset + initialOffset;
            container.style.transform = `translateX(${translateX}px)`;
        }
    }

    function findClosestInactiveButton(activeButton) {
        let activeRect = activeButton.getBoundingClientRect();
        let closestButton = null;
        let minDistance = Infinity;

        buttons.forEach(button => {
            if (!button.classList.contains('active')) {
                let buttonRect = button.getBoundingClientRect();
                let distance = Math.abs(buttonRect.left - activeRect.left);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestButton = button;
                }
            }
        });

        return closestButton;
    }
});

document.querySelectorAll('.lang-btn').forEach(button => {
    button.onclick = function () {
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    };
});

//----------------------------MODE SELECTION--------------------------- 
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("selModalita");
    const cards = document.querySelectorAll(".card");

    let activeCard = document.querySelector(".card.active");
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    container.addEventListener("mousedown", startDrag);
    container.addEventListener("touchstart", startDrag);

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
    }

    function updateActiveCard(card) {
        if (activeCard) {
            activeCard.classList.remove("active");
            activeCard.classList.add("disactive");
        }
        card.classList.add("active");
        card.classList.remove("disactive");
        activeCard = card;

        // **Usiamo un piccolo delay per garantire che lo stato sia aggiornato**
        setTimeout(adjustContainerPosition, 50);

        // **Abilita il click solo sulla card attiva**
        cards.forEach((c) => {
            c.onclick = null; // Rimuove tutti gli eventi onclick
        });

        if (card.id === "cardTraduttore") {
            card.onclick = () => {
                enableCam();
                toSlide("traduzione");
            };
        } else if (card.id === "cardAllenamento") {
            card.onclick = () => {
                toSlide("selDifficolta");
            };
        }
    }

    function adjustContainerPosition() {
        if (!activeCard) return;

        if (activeCard.id === "cardTraduttore") {
            container.style.transform = "translateX(6rem)"; // Sposta a destra
        } else if (activeCard.id === "cardAllenamento") {
            container.style.transform = "translateX(-6rem)"; // Sposta a sinistra
        }
    }

    setTimeout(adjustContainerPosition, 50); // Corregge il posizionamento iniziale
});



/*------------------------------ ROTATE CONTACTS ARROW--------------*/
function toggleFrecciaRotation() {
    const freccia = document.getElementById('freccia');
    freccia.classList.toggle('rotated');
}

/*------------------------INITIAL PAGE LOAD-------------------------*/
function fadeToHomePage() {
    toSlide('loadingIniziale');
    caricaVocabolario()
    const loadingSlide = document.getElementById("loadingIniziale");

    if (loadingSlide) {
        setTimeout(() => {
            loadingSlide.style.transition = "opacity 0.5s ease-out";
            loadingSlide.style.opacity = "0";

            setTimeout(() => {
                loadingSlide.style.display = "none";
                toSlide('homePage');
            }, 500);
        }, 2000);
    }
}

/*------------DIFFICULTY SELECTION BUTTONS-------------*/
function selectDifficulty(selectedButton) {
    const mode = selectedButton.id;

    // If the button is already active, call toSlide with the specific value
    if (selectedButton.classList.contains("active")) {
        if (mode === "modFacile") {
            toSlide("giocoFacile")
        } else if (mode === "modMedia") {
            toSlide("giocoMedio")
        } else if (mode === "modDifficile") {
            toSlide("giocoDifficile")
        }
        return;
    }

    const buttons = document.querySelectorAll("#selDifficolta button");

    buttons.forEach(button => button.classList.remove("active"));

    selectedButton.classList.add("active");
}