function toSlide(dest) {
    // Tutti gli elementi delle slide
    const slides = document.querySelectorAll(".slide");

    // Nascondi tutte le slide
    slides.forEach(slide => {
        slide.style.display = "none";
    });

   /* // Call disableCam if the current slide is not "traduzione"
    if (dest !== "traduzione") {
        disableCam();
    }

    // Call enableCam if the destination slide is "traduzione"
    if (dest === "traduzione") {
        enableCam();
    }*/

    // Mostra solo gli elementi della slide desiderata
    const elementsToShow = getElementsForSlide(dest);
    elementsToShow.forEach(element => {
        element.style.display = "block";
    });
}

function getElementsForSlide(dest) {
    const elements = [];
    if (dest === "homePage") {
        elements.push(
            document.getElementById("barraLogo"),
            document.getElementById("selezioneLinguaBarra"),
            document.getElementById("selModalita"),
            document.getElementById("nav")
        );
    } else if (dest === "vocabolario") {
        elements.push(
            document.getElementById("barraLogo"),
            document.getElementById("selezioneLinguaBarra"),
            document.getElementById("vocabolario"),
            document.getElementById("nav")
        );
    } else if (dest === "contatti") {
        elements.push(
            document.getElementById("barraLogo"),
            document.getElementById("selezioneLinguaBarra"),
            document.getElementById("contatti"),
            document.getElementById("nav")
        );
    } else if (dest === "selDifficolta") {
        elements.push(
            document.getElementById("barraLogo"),
            document.getElementById("selDifficolta"),
            document.getElementById("nav")
        );
    } else if (dest === "traduzione") {
        elements.push(
            document.getElementById("traduzione")
        );
    } else if (dest === "allenamento") {
        elements.push(
            document.getElementById("allenamento")
        );
    }
    return elements;
}

/*----------------- FUNZIONE RENDER DEL VOCABOLARIO ----------------------*/
function caricaVocabolario() {
    const xhr = new XMLHttpRequest();

    xhr.onload = function () {
        try {
            // Parse del JSON una sola volta
            const data = JSON.parse(xhr.responseText);

            // Elementi HTML
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
            console.error(e);
            document.querySelector('#imgVocabolario').innerText = "Caricamento fallito.";
        }
    };

    xhr.onerror = function () {
        document.querySelector('#imgVocabolario').innerText = "Errore di comunicazione.";
    };

    xhr.open("GET", "vocabolario.json");
    xhr.send();
}
