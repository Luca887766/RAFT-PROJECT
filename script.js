function toSlide(dest) {
    // Tutti gli elementi delle slide
    const slides = document.querySelectorAll(".slide");

    // Nascondi tutte le slide
    slides.forEach(slide => {
        slide.style.display = "none";
    });
    
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
            // Parse del JSON
            const data = JSON.parse(xhr.responseText);

            // Elementi HTML
            const inputRicerca = document.querySelector('#barraRicerca input');
            const imgContainer = document.querySelector('#imgVocabolario');

            // Funzione per aggiornare il vocabolario
            function aggiornaVocabolario() {
                const testo = inputRicerca.value.toUpperCase(); // Converte il testo in maiuscolo

                //qua ci va la logica per ottenere la lingua selezionata dai radio/
                const linguaSelezionata = "italiano";

                imgContainer.innerHTML = ""; // Pulizia del contenitore

                // Itera su ogni carattere del testo inserito
                [...testo].forEach(char => {
                    // Gestione dello spazio
                    const lettera = char === " " ? "SPACE" : char;

                    // Cerca nel JSON l'immagine corrispondente
                    const elemento = data.find(item => 
                        item.lettera === lettera && item.lingua.includes(linguaSelezionata)
                    );

                    // Se trovato, aggiunge l'immagine al contenitore
                    if (elemento) {
                        const img = document.createElement('img');
                        img.src = elemento.img + elemento.lettera + ".jpg"; // Assumi che il nome file sia basato sulla lettera
                        img.alt = elemento.lettera;
                        imgContainer.appendChild(img);
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