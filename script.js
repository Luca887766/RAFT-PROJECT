//----------------PWA SETTINGS--------------------------
const cacheName = 'RAFTpwa';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log('Service Worker registered successfully');
    }).catch(err => console.error('Service Worker registration failed:', err));
}

/*if (location.protocol === "http:") {
    location.href = "https" + location.href.substring(4);
}*/

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
    console.error("Update check failed");
};
xhr.open("GET", "pwaversion.txt?t=" + Date.now());
xhr.send();

/*-------------------INTELLIGENCE------------------*/
let webcamRunning = false;
let gestureRecognizer;
let runningMode = "VIDEO";
const videoHeight = 720;
const videoWidth = 1280;
let DrawingUtils;
let GestureRecognizer;

let ultimo_valore = "";
let daStampare = "";
let lastVideoTime = -1;
let lastAppendTime = 0;

let usedTrainingLetters = [];
let usedMediumLetters = [];

// Available camera devices
let videoDevices = [];
let activeVideoDeviceId = null;

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
  if (video.currentTime !== lastVideoTime && video.videoWidth > 0 && video.videoHeight > 0) {
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

    if (results.gestures && results.gestures.length > 0) {
      gestureOutput.style.display = "block";
      const { categoryName, score } = results.gestures[0][0];
      if (score > 0.70 && categoryName !== ultimo_valore) {
        appendi(categoryName);
      }
    }
  }

  if (webcamRunning) {
    window.requestAnimationFrame(predictWebcam);
  }
};

const appendi = (result_text) => {
  const gestureOutput = document.getElementById("gesture_output");
  const currentTime = Date.now();

  if (!result_text) return;

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
    if (currentTime - lastAppendTime < 300) {
      daStampare = daStampare.slice(0, -1);
    }
    daStampare += result_text;
    ultimo_valore = result_text;
    gestureOutput.innerText = daStampare;
  }
  lastAppendTime = currentTime;
};

document.addEventListener("DOMContentLoaded", async () => {
  const visionLibUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
  const {
    FilesetResolver,
    GestureRecognizer: ImportedGestureRecognizer,
    DrawingUtils: ImportedDrawingUtils,
  } = await import(visionLibUrl);
  DrawingUtils = ImportedDrawingUtils;
  GestureRecognizer = ImportedGestureRecognizer;

  const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks(`${visionLibUrl}/wasm`);
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "gesture_recognizer.task",
        delegate: "GPU",
      },
      runningMode: runningMode,
    });
  };

  const loadGestureRecognizer = async () => {
    if (!gestureRecognizer) {
      await createGestureRecognizer();
    }
  };

  await loadGestureRecognizer();

  const video = document.getElementById("webcam");
  const canvasElement = document.getElementById("output_canvas");
  const canvasCtx = canvasElement ? canvasElement.getContext("2d") : null;
  const gestureOutput = document.getElementById("gesture_output");

  const hasGetUserMedia = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  if (!hasGetUserMedia()) {
    console.warn("getUserMedia() non è supportato dal tuo browser");
    return;
  }

  const reinitializeGestureRecognizer = async () => {
    if (gestureRecognizer) {
      await gestureRecognizer.close();
    }
    await createGestureRecognizer();
  };

  window.enableCam = async () => {
    if (!gestureRecognizer) {
      alert("Attendere il caricamento del gesture recognizer");
      return;
    }

    const switchBtn = document.getElementById('cameraSwitchBtn');
    
    try {
      // Check camera devices
      const devices = await getCameraDevices();
      // Show switch button if more than one camera
      if (devices.length > 1 && switchBtn) {
        switchBtn.style.display = 'flex';
      } else if (switchBtn) {
        switchBtn.style.display = 'none';
      }
      
      // Start with user-facing camera (selfie) by default
      const constraints = { 
        video: { 
          facingMode: 'user',
          width: { ideal: videoWidth }, 
          height: { ideal: videoHeight } 
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = document.getElementById("webcam");
      if (video) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", async () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            document.getElementById("loadingIntelligenza").style.display = "none";
            document.getElementById("traduzione").style.display = "block";
            if (!webcamRunning) {
              await reinitializeGestureRecognizer();
              webcamRunning = true;
              predictWebcam();
            }
          } else {
            console.error("Le dimensioni del video non sono corrette.");
          }
        });
      }
    } catch (err) {
      console.error("Errore nell'accesso alla webcam: ", err);
    }
  };

  //Pulisce l'output dei gesti
  window.clearOutput = () => {
    if (gestureOutput) {
      gestureOutput.innerText = "";
      gestureOutput.style.display = "none";
    }
    daStampare = "";
    ultimo_valore = "";
  };

  //inserisce uno spazio manualmente
  window.spaceOutput = () => {
    if (gestureOutput) {
        daStampare += " ";
        gestureOutput.innerText = daStampare;
    }
  };

  //cancella un carattere manualmente
  window.undoOutput = () => {
    if (gestureOutput) {
        daStampare = daStampare.slice(0, -1);
        gestureOutput.innerText = daStampare;
    }
  };

  // Esporta la funzione per disabilitare la webcam
  window.disableCam = disableCam;
});

//--------------------------------- SLIDE MANAGEMENT -----------------------------------*/
function toSlide(dest) {
    const slides = document.querySelectorAll(".slide");
    slides.forEach((slide) => (slide.style.display = "none"));

    const diffButtons = document.querySelectorAll("#selDifficolta button");
    diffButtons.forEach(button => button.classList.remove("active"));

    const currentEasySlide = document.getElementById('giocoFacile');
    const currentMediumSlide = document.getElementById('giocoMedio');
    const currentHardSlide = document.getElementById('giocoDifficile');
    const currentTranslationSlide = document.getElementById('traduzione');

    if (currentEasySlide && currentEasySlide.style.display !== 'none' && dest !== 'giocoFacile') {
        stopTraining();
    }
    if (currentMediumSlide && currentMediumSlide.style.display !== 'none' && dest !== 'giocoMedio') {
        stopMediumTraining();
    }
    if (currentHardSlide && currentHardSlide.style.display !== 'none' && dest !== 'giocoDifficile') {
        stopHardTraining();
    }
    if (currentTranslationSlide && currentTranslationSlide.style.display !== 'none' && dest !== 'traduzione') {
        disableCam();
    }

    if (dest === "traduzione") {
        const nav = document.getElementById("nav");
        if (nav) nav.style.display = "none";
        document.getElementById("loadingIntelligenza").style.display = "flex";
        document.getElementById("traduzione").style.display = "none";
        enableCam();
        return;
    } else if (dest === "giocoFacile" || dest === "giocoMedio" || dest === "giocoDifficile") {
        const nav = document.getElementById("nav");
        if (nav) nav.style.display = "none";
    } else {
        if (dest !== 'giocoFacile' && trainingRunning) {
             stopTraining();
        }
        if (dest !== 'giocoMedio' && mediumTrainingRunning) {
             stopMediumTraining();
        }
        if (dest !== 'giocoDifficile' && hardTrainingRunning) {
             stopHardTraining();
        }
    }

    const elementsToShow = getElementsForSlide(dest);
    elementsToShow.forEach((element) => {
        if (!element) return;
        if ([ "nav", "barraLogo", "selezioneLinguaBarra", "selModalita", "loadingIntelligenza", "loadingIniziale", "selDifficolta"].includes(element.id)) {
            element.style.display = "flex";
        } else {
            element.style.display = "block";
        }
    });

    const nav = document.getElementById("nav");
    if (nav) {
        if ([ "homePage", "vocabolario", "contatti", "selDifficolta"].includes(dest)) {
            nav.style.display = "flex";
        } else {
            nav.style.display = "none";
        }
    }
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

let vocabolario = null;
let activeButtonContent = 'europe';

function caricaVocabolario() {
    if (vocabolario) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onload = function () {
            try {
                vocabolario = JSON.parse(xhr.responseText);
                console.log("Vocabolario caricato.");
                inizializzaEventi();
                resolve();
            } catch (e) {
                console.error("Error parsing vocabulary data: ", e);
                document.querySelector('#imgVocabolario').innerText = "Loading failed.";
                reject(e);
            }
        };

        xhr.onerror = function () {
            console.error("Communication error loading vocabulary.");
            document.querySelector('#imgVocabolario').innerText = "Communication error.";
            reject(new Error("Communication error"));
        };

        xhr.open("GET", "vocabolario.json?t=" + Date.now());
        xhr.send();
    });
}

function inizializzaEventi() {
    const inputRicerca = document.querySelector('#barraRicerca input');
    const imgContainer = document.querySelector('#imgVocabolario');
    let linguaPrecedente = activeButtonContent;

    function aggiornaVocabolario() {
        const testo = inputRicerca.value.toUpperCase();

        if (testo.length === 0) {
            imgContainer.classList.add('alternato');
        } else {
            imgContainer.classList.remove('alternato');
        }

        const linguaSelezionata = activeButtonContent;
        const linguaCorretta = linguaSelezionata.trim().toLowerCase();

        imgContainer.innerHTML = "";

        const lettereDaMostrare = testo.length > 0 ? testo.split('') : vocabolario
            .filter(item => item.lingua.includes(linguaCorretta))
            .map(item => item.lettera);


        lettereDaMostrare.forEach(char => {
            const div = document.createElement('div');
            div.className = 'lettera';

            const lettera = char === " " ? "SPACE" : char;

            const linguaCorretta = linguaSelezionata.trim().toLowerCase();

            const elemento = vocabolario.find(item =>
                item.lettera === lettera && item.lingua.includes(linguaCorretta)
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

    aggiornaVocabolario();

    inputRicerca.addEventListener('input', aggiornaVocabolario);

    setInterval(() => {
        if (activeButtonContent !== linguaPrecedente) {
            linguaPrecedente = activeButtonContent;
            aggiornaVocabolario();
        }
    }, 200);
}

/*----------------- LANGUAGE SELECTION FUNCTION ----------------------*/
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('selezioneLinguaBarra');
    const europeButton = document.querySelector('.lang-btn[data-lang="Europe"]');
    const containerRect = container.getBoundingClientRect();
    const EUROPE_OFFSET = europeButton ? europeButton.getBoundingClientRect().left - containerRect.left : 20;

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

                const buttonRect = button.getBoundingClientRect();
                const newOffset = buttonRect.left - container.getBoundingClientRect().left;
                const translateX = EUROPE_OFFSET - newOffset + initialOffset;
                container.style.transform = `translateX(${translateX}px)`;
                activeButtonContent = button.textContent;
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
            activeButtonContent = closestInactiveButton.textContent;
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
        activeButtonContent = this.textContent;
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

        setTimeout(adjustContainerPosition, 50);

        cards.forEach((c) => {
            c.onclick = null;
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
            container.style.transform = "translateX(6rem)";
        } else if (activeCard.id === "cardAllenamento") {
            container.style.transform = "translateX(-6rem)";
        }
    }

    setTimeout(adjustContainerPosition, 50);
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

/*-------------------EASY TRAINING MODE------------------*/
let trainingRunning = false;
let currentTrainingLetter = null;
let correctGestureStartTime = null;
const CORRECT_GESTURE_DURATION = 1000;
let trainingTimeoutId = null;
let lastTrainingVideoTime = -1;

const disableTrainingCam = () => {
    const video = document.getElementById("trainingWebcam");
    if (video && video.srcObject) {
        const stream = video.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
        video.removeEventListener("loadeddata", predictTraining);
    }
    const container = document.getElementById("targetLetterContainer");
    if (container) {
        container.classList.remove("correct-gesture");
    }
    if (trainingTimeoutId) {
        clearTimeout(trainingTimeoutId);
        trainingTimeoutId = null;
    }
};

window.stopTraining = () => {
    trainingRunning = false;
    disableTrainingCam();
    currentTrainingLetter = null;
    correctGestureStartTime = null;
};

const showNewTrainingLetter = () => {
    if (!vocabolario) {
        console.error("Vocabolario non caricato per l'allenamento.");
        return;
    }

    const targetImage = document.getElementById("targetLetterImage");
    const targetText = document.getElementById("targetLetterText");
    const container = document.getElementById("targetLetterContainer");

    if (container) container.classList.remove("correct-gesture");
    correctGestureStartTime = null;

    const currentLanguage = activeButtonContent.trim().toLowerCase();
    const allPossibleLetters = vocabolario.filter(item =>
        item.lingua.includes(currentLanguage) && 
        item.lettera !== "SPACE" && 
        item.lettera !== "DELETE"
    );
    
    if (allPossibleLetters.length === 0) {
        console.error("Nessuna lettera disponibile per l'allenamento nella lingua corrente.");
        targetText.innerText = "Error";
        targetImage.src = "";
        targetImage.alt = "Error loading letters";
        targetImage.style.display = "none";
        return;
    }
    
    // Filter out letters that have already been used
    let availableLetters = allPossibleLetters.filter(letter => 
        !usedTrainingLetters.includes(letter.lettera)
    );
    
    // If all letters have been used, reset the tracking
    if (availableLetters.length === 0) {
        usedTrainingLetters = [];
        availableLetters = allPossibleLetters;
    }
    
    const randomIndex = Math.floor(Math.random() * availableLetters.length);
    currentTrainingLetter = availableLetters[randomIndex];
    
    // Add to used letters
    usedTrainingLetters.push(currentTrainingLetter.lettera);

    targetText.innerText = currentTrainingLetter.lettera;
    targetImage.src = currentTrainingLetter.img;
    targetImage.alt = `Target Letter: ${currentTrainingLetter.lettera}`;
    targetImage.style.display = "block";
};

const predictTraining = async () => {
    const video = document.getElementById("trainingWebcam");
    const canvasElement = document.getElementById("training_output_canvas");
    const canvasCtx = canvasElement ? canvasElement.getContext("2d") : null;
    const container = document.getElementById("targetLetterContainer");

    if (!gestureRecognizer || !canvasElement || !canvasCtx || !trainingRunning || !video || video.videoWidth === 0 || video.videoHeight === 0) {
        if (trainingRunning) {
            trainingTimeoutId = window.requestAnimationFrame(predictTraining);
        }
        return;
    }

    if (canvasElement.width !== video.videoWidth || canvasElement.height !== video.videoHeight) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    const nowInMs = Date.now();
    let results;
    if (video.currentTime !== lastTrainingVideoTime) {
        lastTrainingVideoTime = video.currentTime;
        results = await gestureRecognizer.recognizeForVideo(video, nowInMs);
    } else {
        if (trainingRunning) {
            trainingTimeoutId = window.requestAnimationFrame(predictTraining);
        }
        return;
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results && results.landmarks) {
        const drawingUtils = new DrawingUtils(canvasCtx);
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
            drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1 });
        }
    }

    let recognizedLetter = "None";
    if (results && results.gestures && results.gestures.length > 0) {
        const { categoryName, score } = results.gestures[0][0];
        if (score > 0.70) {
            recognizedLetter = categoryName;
        }
    }

    if (currentTrainingLetter && recognizedLetter.toUpperCase() === currentTrainingLetter.lettera.toUpperCase()) {
        if (correctGestureStartTime === null) {
            correctGestureStartTime = nowInMs;
        }
        if (container && !container.classList.contains("correct-gesture")) {
             container.classList.add("correct-gesture");
        }
        if (nowInMs - correctGestureStartTime >= CORRECT_GESTURE_DURATION) {
            showNewTrainingLetter();
        }
    } else {
        correctGestureStartTime = null;
        if (container && container.classList.contains("correct-gesture")) {
            container.classList.remove("correct-gesture");
        }
    }

    if (trainingRunning) {
        trainingTimeoutId = window.requestAnimationFrame(predictTraining);
    }
};

const enableTrainingCam = async () => {
  if (!gestureRecognizer) {
    alert("Attendere il caricamento del gesture recognizer");
    return;
  }
  
  if (trainingRunning && document.getElementById("trainingWebcam").srcObject) {
    return;
  }
  
  const switchBtn = document.getElementById('trainingCameraSwitchBtn');
  
  try {
    // Check camera devices
    const devices = await getCameraDevices();
    // Show switch button if more than one camera
    if (devices.length > 1 && switchBtn) {
      switchBtn.style.display = 'flex';
    } else if (switchBtn) {
      switchBtn.style.display = 'none';
    }
    
    // Start with user-facing camera by default
    const constraints = { 
      video: { 
        facingMode: 'user',
        width: { ideal: 1280 }, 
        height: { ideal: 720 } 
      } 
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById("trainingWebcam");
    if (video) {
      video.srcObject = stream;
      await new Promise((resolve) => {
        video.onloadeddata = () => {
          resolve();
        };
      });
      
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        video.style.display = "block";
        trainingRunning = true;
        lastTrainingVideoTime = -1;
        predictTraining();
      } else {
        console.error("Training webcam video dimensions not available after loadeddata.");
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
        alert("Failed to initialize training webcam.");
      }
    }
  } catch (err) {
    console.error("Error accessing training webcam: ", err);
    alert("Could not access webcam for training. Please check permissions.");
    trainingRunning = false;
  }
};

/*-------------------MEDIUM TRAINING MODE------------------*/
let mediumTrainingRunning = false;
let currentMediumLetter = null;
let correctMediumGestureStartTime = null;
const MEDIUM_CORRECT_GESTURE_DURATION = 1000;
let mediumTimeoutId = null;
let lastMediumVideoTime = -1;
let showingCorrectImage = false;
let correctImageTimeout = null;

const disableMediumCam = () => {
    const video = document.getElementById("mediumWebcam");
    if (video && video.srcObject) {
        const stream = video.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
        video.removeEventListener("loadeddata", predictMediumTraining);
    }
    const container = document.getElementById("mediumLetterContainer");
    if (container) {
        container.classList.remove("correct-gesture");
    }
    if (mediumTimeoutId) {
        clearTimeout(mediumTimeoutId);
        mediumTimeoutId = null;
    }
    if (correctImageTimeout) {
        clearTimeout(correctImageTimeout);
        correctImageTimeout = null;
    }
    const correctContainer = document.getElementById("mediumCorrectContainer");
    if (correctContainer) {
        correctContainer.style.display = "none";
    }
};

window.stopMediumTraining = () => {
    mediumTrainingRunning = false;
    disableMediumCam();
    currentMediumLetter = null;
    correctMediumGestureStartTime = null;
    showingCorrectImage = false;
};

const showNewMediumLetter = () => {
    if (!vocabolario) {
        console.error("Vocabolario non caricato per l'allenamento medio.");
        return;
    }

    const targetText = document.getElementById("mediumTargetText");
    const container = document.getElementById("mediumLetterContainer");
    const correctImage = document.getElementById("mediumCorrectImage");
    const correctContainer = document.getElementById("mediumCorrectContainer");

    if (container) container.classList.remove("correct-gesture");
    if (correctContainer) correctContainer.style.display = "none";
    correctMediumGestureStartTime = null;
    showingCorrectImage = false;

    const currentLanguage = activeButtonContent.trim().toLowerCase();

    const allPossibleLetters = vocabolario.filter(item =>
        item.lingua.includes(currentLanguage) &&
        item.lettera !== "SPACE" &&
        item.lettera !== "DEL"
    );

    if (allPossibleLetters.length === 0) {
        console.error("Nessuna lettera disponibile per l'allenamento nella lingua corrente.");
        targetText.innerText = "Error";
        return;
    }
    
    // Filter out letters that have already been used
    let availableLetters = allPossibleLetters.filter(letter => 
        !usedMediumLetters.includes(letter.lettera)
    );
    
    // If all letters have been used, reset the tracking
    if (availableLetters.length === 0) {
        usedMediumLetters = [];
        availableLetters = allPossibleLetters;
    }
    
    const randomIndex = Math.floor(Math.random() * availableLetters.length);
    currentMediumLetter = availableLetters[randomIndex];
    
    // Add to used letters
    usedMediumLetters.push(currentMediumLetter.lettera);

    targetText.innerText = currentMediumLetter.lettera;

    correctImage.src = currentMediumLetter.img;
    correctImage.alt = `Letter: ${currentMediumLetter.lettera}`;
};

const showCorrectImage = () => {
    if (showingCorrectImage) return;

    showingCorrectImage = true;
    const correctContainer = document.getElementById("mediumCorrectContainer");
    correctContainer.style.display = "block";

    correctImageTimeout = setTimeout(() => {
        correctContainer.style.display = "none";
        showingCorrectImage = false;
        showNewMediumLetter();
    }, 2000);
};

const predictMediumTraining = async () => {
    const video = document.getElementById("mediumWebcam");
    const canvasElement = document.getElementById("medium_output_canvas");
    const canvasCtx = canvasElement ? canvasElement.getContext("2d") : null;
    const container = document.getElementById("mediumLetterContainer");

    if (!gestureRecognizer || !canvasElement || !canvasCtx || !mediumTrainingRunning || !video || video.videoWidth === 0 || video.videoHeight === 0) {
        if (mediumTrainingRunning) {
            mediumTimeoutId = window.requestAnimationFrame(predictMediumTraining);
        }
        return;
    }

    if (canvasElement.width !== video.videoWidth || canvasElement.height !== video.videoHeight) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    const nowInMs = Date.now();
    let results;
    if (video.currentTime !== lastMediumVideoTime) {
        lastMediumVideoTime = video.currentTime;
        results = await gestureRecognizer.recognizeForVideo(video, nowInMs);
    } else {
        if (mediumTrainingRunning) {
            mediumTimeoutId = window.requestAnimationFrame(predictMediumTraining);
        }
        return;
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results && results.landmarks) {
        const drawingUtils = new DrawingUtils(canvasCtx);
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
            drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1 });
        }
    }

    if (showingCorrectImage) {
        if (mediumTrainingRunning) {
            mediumTimeoutId = window.requestAnimationFrame(predictMediumTraining);
        }
        return;
    }

    let recognizedLetter = "None";
    if (results && results.gestures && results.gestures.length > 0) {
        const { categoryName, score } = results.gestures[0][0];
        if (score > 0.70) {
            recognizedLetter = categoryName;
        }
    }

    if (currentMediumLetter && recognizedLetter.toUpperCase() === currentMediumLetter.lettera.toUpperCase()) {
        if (correctMediumGestureStartTime === null) {
            correctMediumGestureStartTime = nowInMs;
        }
        if (container && !container.classList.contains("correct-gesture")) {
             container.classList.add("correct-gesture");
        }
        if (nowInMs - correctMediumGestureStartTime >= MEDIUM_CORRECT_GESTURE_DURATION) {
            showCorrectImage();
        }
    } else {
        correctMediumGestureStartTime = null;
        if (container && container.classList.contains("correct-gesture")) {
            container.classList.remove("correct-gesture");
        }
    }

    if (mediumTrainingRunning) {
        mediumTimeoutId = window.requestAnimationFrame(predictMediumTraining);
    }
};

const enableMediumCam = async () => {
    if (!gestureRecognizer) {
        alert("Attendere il caricamento del gesture recognizer");
        return;
    }
    if (mediumTrainingRunning && document.getElementById("mediumWebcam").srcObject) {
        return;
    }

    const constraints = { video: { width: 1280, height: 720 } };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById("mediumWebcam");
        if (video) {
            video.srcObject = stream;
            await new Promise((resolve) => {
                video.onloadeddata = () => {
                    resolve();
                };
            });
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                 video.style.display = "block";
                 mediumTrainingRunning = true;
                 lastMediumVideoTime = -1;
                 predictMediumTraining();
            } else {
                 console.error("Medium training webcam video dimensions not available after loadeddata.");
                 stream.getTracks().forEach((track) => track.stop());
                 video.srcObject = null;
                 alert("Failed to initialize medium training webcam.");
            }
        }
    } catch (err) {
        console.error("Error accessing medium training webcam: ", err);
        alert("Could not access webcam for medium training. Please check permissions.");
        mediumTrainingRunning = false;
    }
};

/*-------------------HARD TRAINING MODE------------------*/
let hardTrainingRunning = false;
let paroleList = null;
let currentHardWord = null;
let currentHardLetterIndex = 0;
let hardCorrectGestureStartTime = null;
const HARD_CORRECT_GESTURE_DURATION = 500;
let hardTimeoutId = null;
let lastHardVideoTime = -1;
let showingHardCorrectWord = false;
let hardCorrectWordTimeout = null;

const loadParole = async () => {
    if (paroleList) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            try {
                const data = JSON.parse(xhr.responseText);
                paroleList = data.parole;
                console.log("Lista parole caricata:", paroleList.length, "parole");
                resolve();
            } catch (e) {
                console.error("Errore nel parsing del file parole.json: ", e);
                alert("Errore nel caricamento delle parole per la modalità difficile.");
                reject(e);
            }
        };
        xhr.onerror = function () {
            console.error("Errore di comunicazione nel caricamento di parole.json.");
            alert("Errore di comunicazione nel caricamento delle parole.");
            reject(new Error("Communication error"));
        };
        xhr.open("GET", "parole.json?t=" + Date.now());
        xhr.send();
    });
};

const disableHardCam = () => {
    const video = document.getElementById("hardWebcam");
    if (video && video.srcObject) {
        const stream = video.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
        video.removeEventListener("loadeddata", predictHardTraining);
    }
    if (hardTimeoutId) {
        clearTimeout(hardTimeoutId);
        hardTimeoutId = null;
    }
    if (hardCorrectWordTimeout) {
        clearTimeout(hardCorrectWordTimeout);
        hardCorrectWordTimeout = null;
    }
    const correctContainer = document.getElementById("hardCorrectContainer");
    if (correctContainer) {
        correctContainer.style.display = "none";
    }
};

window.stopHardTraining = () => {
    hardTrainingRunning = false;
    disableHardCam();
    currentHardWord = null;
    currentHardLetterIndex = 0;
    hardCorrectGestureStartTime = null;
    showingHardCorrectWord = false;
};

const updateHardWordDisplay = () => {
    const targetWordElement = document.getElementById("hardTargetWord");
    if (!currentHardWord || !targetWordElement) return;

    let highlightedWord = "";
    for (let i = 0; i < currentHardWord.length; i++) {
        if (i === currentHardLetterIndex) {
            highlightedWord += `<span class="current-letter">${currentHardWord[i]}</span>`;
        } else {
            highlightedWord += currentHardWord[i];
        }
    }
    targetWordElement.innerHTML = highlightedWord.toUpperCase();
};

const updateHardProgress = () => {
    const progressBar = document.getElementById("hardProgress");
    if (!currentHardWord || !progressBar) return;

    const progressPercentage = (currentHardLetterIndex / currentHardWord.length) * 100;
    progressBar.style.width = `${progressPercentage}%`;
};

const showNewHardWord = () => {
    if (!paroleList || paroleList.length === 0) {
        console.error("Lista parole non caricata o vuota per l'allenamento difficile.");
        return;
    }

    const correctContainer = document.getElementById("hardCorrectContainer");

    if (correctContainer) correctContainer.style.display = "none";
    hardCorrectGestureStartTime = null;
    showingHardCorrectWord = false;

    const randomIndex = Math.floor(Math.random() * paroleList.length);
    currentHardWord = paroleList[randomIndex];
    currentHardLetterIndex = 0;

    updateHardWordDisplay();
    updateHardProgress();
};

const showHardCorrectWord = () => {
    if (showingHardCorrectWord) return;

    showingHardCorrectWord = true;
    const correctContainer = document.getElementById("hardCorrectContainer");
    const correctWordElement = document.getElementById("hardCorrectWord");

    correctWordElement.innerText = currentHardWord.toUpperCase();
    correctContainer.style.display = "block";

    hardCorrectWordTimeout = setTimeout(() => {
        correctContainer.style.display = "none";
        showingHardCorrectWord = false;
        showNewHardWord();
    }, 3000);
};

const predictHardTraining = async () => {
    const video = document.getElementById("hardWebcam");
    const canvasElement = document.getElementById("hard_output_canvas");
    const canvasCtx = canvasElement ? canvasElement.getContext("2d") : null;

    if (!gestureRecognizer || !canvasElement || !canvasCtx || !hardTrainingRunning || !video || video.videoWidth === 0 || video.videoHeight === 0) {
        if (hardTrainingRunning) {
            hardTimeoutId = window.requestAnimationFrame(predictHardTraining);
        }
        return;
    }

    if (canvasElement.width !== video.videoWidth || canvasElement.height !== video.videoHeight) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    const nowInMs = Date.now();
    let results;
    if (video.currentTime !== lastHardVideoTime) {
        lastHardVideoTime = video.currentTime;
        results = await gestureRecognizer.recognizeForVideo(video, nowInMs);
    } else {
        if (hardTrainingRunning) {
            hardTimeoutId = window.requestAnimationFrame(predictHardTraining);
        }
        return;
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results && results.landmarks) {
        const drawingUtils = new DrawingUtils(canvasCtx);
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
            drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1 });
        }
    }

    if (showingHardCorrectWord) {
        if (hardTrainingRunning) {
            hardTimeoutId = window.requestAnimationFrame(predictHardTraining);
        }
        return;
    }

    let recognizedLetter = "None";
    if (results && results.gestures && results.gestures.length > 0) {
        const { categoryName, score } = results.gestures[0][0];
        if (score > 0.70) {
            recognizedLetter = categoryName;
        }
    }

    const targetLetter = currentHardWord ? currentHardWord[currentHardLetterIndex] : null;

    if (targetLetter && recognizedLetter.toUpperCase() === targetLetter.toUpperCase()) {
        if (hardCorrectGestureStartTime === null) {
            hardCorrectGestureStartTime = nowInMs;
        }

        if (nowInMs - hardCorrectGestureStartTime >= HARD_CORRECT_GESTURE_DURATION) {
            currentHardLetterIndex++;
            updateHardProgress();
            hardCorrectGestureStartTime = null;

            if (currentHardLetterIndex >= currentHardWord.length) {
                showHardCorrectWord();
            } else {
                updateHardWordDisplay();
            }
        }
    } else {
        hardCorrectGestureStartTime = null;
    }

    if (hardTrainingRunning) {
        hardTimeoutId = window.requestAnimationFrame(predictHardTraining);
    }
};

const enableHardCam = async () => {
    if (!gestureRecognizer) {
        alert("Attendere il caricamento del gesture recognizer");
        return;
    }
    if (hardTrainingRunning && document.getElementById("hardWebcam").srcObject) {
        return;
    }

    const constraints = { video: { width: 1280, height: 720 } };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById("hardWebcam");
        if (video) {
            video.srcObject = stream;
            await new Promise((resolve) => {
                video.onloadeddata = () => {
                    resolve();
                };
            });
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                 video.style.display = "block";
                 hardTrainingRunning = true;
                 lastHardVideoTime = -1;
                 predictHardTraining();
            } else {
                 console.error("Hard training webcam video dimensions not available.");
                 stream.getTracks().forEach((track) => track.stop());
                 video.srcObject = null;
                 alert("Failed to initialize hard training webcam.");
            }
        }
    } catch (err) {
        console.error("Error accessing hard training webcam: ", err);
        alert("Could not access webcam for hard training. Please check permissions.");
        hardTrainingRunning = false;
    }
};

window.startEasyTraining = async () => {
    // Show loading screen
    const loadingScreen = document.getElementById("loadingTrainingMode");
    const trainingContainer = document.getElementById("trainingContainer");
    
    if (loadingScreen) loadingScreen.style.display = "flex";
    if (trainingContainer) trainingContainer.style.display = "none";
    
    try {
        // Initialize vocabulary if needed
        if (!vocabolario) {
            await caricaVocabolario();
        }
        
        showNewTrainingLetter();
        await enableTrainingCam();
        
        // Hide loading screen when everything is ready
        if (loadingScreen) loadingScreen.style.display = "none";
        if (trainingContainer) trainingContainer.style.display = "block";
    } catch (error) {
        console.error("Error starting easy training:", error);
        alert("Errore nel caricamento dell'allenamento.");
        toSlide('selDifficolta');
    }
};

window.startMediumTraining = async () => {
    // Show loading screen
    const loadingScreen = document.getElementById("loadingMediumMode");
    const mediumTrainingContainer = document.getElementById("mediumTrainingContainer");
    
    if (loadingScreen) loadingScreen.style.display = "flex";
    if (mediumTrainingContainer) mediumTrainingContainer.style.display = "none";
    
    try {
        // Initialize vocabulary if needed
        if (!vocabolario) {
            await caricaVocabolario();
        }
        
        // Initialize camera devices list
        if (!videoDevices.length) {
            try {
                videoDevices = await getCameraDevices();
                console.log(`Camera devices detected: ${videoDevices.length}`);
                
                // Initialize camera selector button based on detected devices
                const switchBtn = document.getElementById('mediumCameraSwitchBtn');
                if (switchBtn) {
                    if (videoDevices.length <= 1) {
                        switchBtn.style.display = 'none';
                    } else {
                        initCameraSelector('mediumCameraSwitchBtn', 'mediumCameraDropdown', document.getElementById('mediumWebcam'), 'medium');
                    }
                }
            } catch (err) {
                console.error('Error detecting camera devices:', err);
            }
        }
        
        showNewMediumLetter();
        await enableMediumCam();
        
        // Hide loading screen when everything is ready
        if (loadingScreen) loadingScreen.style.display = "none";
        if (mediumTrainingContainer) mediumTrainingContainer.style.display = "block";
    } catch (error) {
        console.error("Error starting medium training:", error);
        alert("Errore nel caricamento dell'allenamento medio.");
        toSlide('selDifficolta');
    }
};

window.startHardTraining = async () => {
    // Show loading screen
    const loadingScreen = document.getElementById("loadingHardMode");
    const hardTrainingContainer = document.getElementById("hardTrainingContainer");
    
    if (loadingScreen) loadingScreen.style.display = "flex";
    if (hardTrainingContainer) hardTrainingContainer.style.display = "none";
    
    try {
        // Initialize vocabulary if needed
        if (!vocabolario) {
            await caricaVocabolario();
        }
        try {
            await loadParole();
        } catch (error) {
            console.error("Failed to load words for hard mode:", error);
            throw error;
        }

        showNewHardWord();
        await enableHardCam();
        
        // Hide loading screen when everything is ready
        if (loadingScreen) loadingScreen.style.display = "none";
        if (hardTrainingContainer) hardTrainingContainer.style.display = "block";
    } catch (error) {
        console.error("Error starting hard training:", error);
        alert("Errore nel caricamento dell'allenamento difficile.");
        toSlide('selDifficolta');
    }
};

/*------------DIFFICULTY SELECTION BUTTONS-------------*/
function selectDifficulty(selectedButton) {
    const mode = selectedButton.id;
    const alreadyActive = selectedButton.classList.contains("active");

    const buttons = document.querySelectorAll("#selDifficolta button");
    buttons.forEach(button => button.classList.remove("active"));

    selectedButton.classList.add("active");

    if (alreadyActive) {
        if (mode === "modFacile") {
            toSlide("giocoFacile");
            startEasyTraining();
        } else if (mode === "modMedia") {
            toSlide("giocoMedio");
            startMediumTraining();
        } else if (mode === "modDifficile") {
            toSlide("giocoDifficile");
            startHardTraining();
        }
    } else {
      if (trainingRunning && mode !== "modFacile") {
          stopTraining();
      }
      if (mediumTrainingRunning && mode !== "modMedia") {
          stopMediumTraining();
      }
      if (hardTrainingRunning && mode !== "modDifficile") {
          stopHardTraining();
      }
    }
}

/*------------CAMERA SWITCHING FUNCTIONALITY-------------*/
async function getCameraDevices() {
  try {
    // First request camera permission to ensure we get labels
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Stop the stream immediately
    tempStream.getTracks().forEach(track => track.stop());
    
    // Now enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    console.log(`Detected ${videoDevices.length} camera devices`);
    videoDevices.forEach((device, i) => {
      console.log(`Camera ${i+1}: ${device.label || 'unlabeled'}`);
    });
    
    return videoDevices;
  } catch (err) {
    console.error('Error enumerating devices:', err);
    return [];
  }
}

// Initialize camera buttons for all modes
function initCameraSelector(btnId, dropdownId, videoElementId, activeMode) {
  const btn = document.getElementById(btnId);
  const dropdown = document.getElementById(dropdownId);
  const video = document.getElementById(videoElementId);
  
  if (!btn || !dropdown || !video) return;
  
  // Toggle dropdown visibility
  btn.onclick = async () => {
    // Get camera devices
    const devices = await getCameraDevices();
    
    // Hide button if only one camera available
    if (devices.length <= 1) {
      btn.style.display = 'none';
      return;
    }
    
    // Populate dropdown
    populateCameraDropdown(devices, dropdown, video, activeMode);
    
    // Toggle display
    if (dropdown.style.display === 'block') {
      dropdown.style.display = 'none';
    } else {
      dropdown.style.display = 'block';
    }
  };
  
  // Close dropdown when clicking elsewhere
  document.addEventListener('click', (event) => {
    if (!btn.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.style.display = 'none';
    }
  });
}

function populateCameraDropdown(devices, dropdown, videoElement, activeMode) {
  // Clear dropdown
  dropdown.innerHTML = '';
  
  // Get current device ID
  const currentDeviceId = videoElement.srcObject?.getVideoTracks()[0]?.getSettings()?.deviceId;
  
  // For iOS, simplify the camera list (iPhone often shows many virtual cameras)
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  if (isIOS) {
    // On iOS, just add front and back camera options
    const frontBtn = document.createElement('button');
    frontBtn.innerHTML = '📱 Fotocamera Frontale';
    frontBtn.onclick = async () => {
      await switchToCamera('user', videoElement, activeMode);
      dropdown.style.display = 'none';
    };
    dropdown.appendChild(frontBtn);
    
    const backBtn = document.createElement('button');
    backBtn.innerHTML = '🌍 Fotocamera Posteriore';
    backBtn.onclick = async () => {
      await switchToCamera('environment', videoElement, activeMode);
      dropdown.style.display = 'none';
    };
    dropdown.appendChild(backBtn);
    
    return; // Don't add individual device entries for iOS
  }
  
  // For non-iOS devices, proceed with regular device listing
  // Add specific device options
  // Filter out duplicates based on label to reduce clutter
  const uniqueDevices = [];
  const labelsSeen = new Set();
  
  devices.forEach(device => {
    const label = device.label || 'Unnamed Camera';
    if (!labelsSeen.has(label)) {
      labelsSeen.add(label);
      uniqueDevices.push(device);
    }
  });
  
  uniqueDevices.forEach((device, index) => {
    const button = document.createElement('button');
    
    // Try to determine if it's front or back camera based on label
    const deviceLabel = device.label || `Camera ${index + 1}`;
    let labelText = deviceLabel;
    
    // Label identification
    if (deviceLabel.toLowerCase().includes('front') || 
        deviceLabel.toLowerCase().includes('selfie') || 
        deviceLabel.toLowerCase().includes('user')) {
      labelText = '📱 Fotocamera Frontale';
    } else if (deviceLabel.toLowerCase().includes('back') || 
               deviceLabel.toLowerCase().includes('rear') || 
               deviceLabel.toLowerCase().includes('environment')) {
      labelText = '🌍 Fotocamera Posteriore';
    } else {
      labelText = `📹 ${deviceLabel}`;
    }
    
    button.innerHTML = labelText;
    button.className = device.deviceId === currentDeviceId ? 'active' : '';
    
    button.onclick = async () => {
      await switchToCamera(device.deviceId, videoElement, activeMode);
      dropdown.style.display = 'none';
    };
    
    dropdown.appendChild(button);
  });
  
  // If we couldn't identify front/back cameras, add generic options
  const hasFrontOption = dropdown.innerHTML.includes('Fotocamera Frontale');
  const hasBackOption = dropdown.innerHTML.includes('Fotocamera Posteriore');
  
  if (!hasFrontOption) {
    const frontBtn = document.createElement('button');
    frontBtn.innerHTML = '📱 Fotocamera Frontale';
    frontBtn.onclick = async () => {
      await switchToCamera('user', videoElement, activeMode);
      dropdown.style.display = 'none';
    };
    dropdown.insertBefore(frontBtn, dropdown.firstChild);
  }
  
  if (!hasBackOption) {
    const backBtn = document.createElement('button');
    backBtn.innerHTML = '🌍 Fotocamera Posteriore';
    backBtn.onclick = async () => {
      await switchToCamera('environment', videoElement, activeMode);
      dropdown.style.display = 'none';
    };
    dropdown.insertBefore(backBtn, hasFrontOption ? dropdown.children[1] : dropdown.firstChild);
  }
}

async function switchToCamera(source, videoElement, activeMode) {
  try {
    // Stop current stream
    if (videoElement.srcObject) {
      videoElement.srcObject.getTracks().forEach(track => track.stop());
    }
    
    // Set constraints based on source
    let constraints = { video: {} };
    
    // Flag to track if we're using front or back camera
    let isBackCamera = false;
    
    if (source === 'user' || source === 'environment') {
      // Use facing mode
      constraints.video.facingMode = source;
      isBackCamera = source === 'environment';
    } else {
      // Use device ID
      constraints.video.deviceId = { exact: source };
      
      // Try to determine if this is a back camera from the device label
      const matchingDevice = videoDevices.find(device => device.deviceId === source);
      if (matchingDevice) {
        const label = matchingDevice.label.toLowerCase();
        isBackCamera = label.includes('back') || 
                       label.includes('rear') || 
                       label.includes('environment');
      }
    }
    
    // Add size constraints
    constraints.video.width = { ideal: 1280 };
    constraints.video.height = { ideal: 720 };
    
    console.log(`Switching to ${isBackCamera ? 'BACK' : 'FRONT'} camera with constraints:`, JSON.stringify(constraints));
    
    // Request new stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    
    // Wait for the video to be ready
    await new Promise((resolve) => {
      videoElement.onloadedmetadata = () => resolve();
    });
    
    // Apply mirroring based on camera type
    // Front camera should be mirrored, back camera should not be mirrored
    videoElement.style.transform = isBackCamera ? 'scaleX(1)' : 'scaleX(-1)';
    
    // Also mirror the canvas that draws the hand landmarks
    let canvasElement;
    if (activeMode === 'translation') {
      canvasElement = document.getElementById('output_canvas');
    } else if (activeMode === 'training') {
      canvasElement = document.getElementById('training_output_canvas');
    } else if (activeMode === 'medium') {
      canvasElement = document.getElementById('medium_output_canvas');
    } else if (activeMode === 'hard') {
      canvasElement = document.getElementById('hard_output_canvas');
    }
    
    if (canvasElement) {
      canvasElement.style.transform = isBackCamera ? 'scaleX(1)' : 'scaleX(-1)';
    }
    
    // Reset timing
    if (activeMode === 'translation') {
      lastVideoTime = -1;
    } else if (activeMode === 'training') {
      lastTrainingVideoTime = -1;
    } else if (activeMode === 'medium') {
      lastMediumVideoTime = -1;
    } else if (activeMode === 'hard') {
      lastHardVideoTime = -1;
    }
    
    console.log(`Camera switched successfully to ${isBackCamera ? 'back' : 'front'} camera`);
    return true;
  } catch (err) {
    console.error('Error switching camera:', err);
    alert('Errore nel cambio della fotocamera. Riprova.');
    return false;
  }
}

// Call this function to initialize camera selectors for each mode
document.addEventListener('DOMContentLoaded', () => {
  // Initialize selectors when each button is clicked
  initCameraSelector('cameraSwitchBtn', 'cameraDropdown', 'webcam', 'translation');
  initCameraSelector('trainingCameraSwitchBtn', 'trainingCameraDropdown', 'trainingWebcam', 'training');
  initCameraSelector('mediumCameraSwitchBtn', 'mediumCameraDropdown', 'mediumWebcam', 'medium');
  initCameraSelector('hardCameraSwitchBtn', 'hardCameraDropdown', 'hardWebcam', 'hard');
});