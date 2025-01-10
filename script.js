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

    // Avvia l'IA se la destinazione è "traduzione"
    if (dest === "traduzione") {
        startAI();
    }
}

function getElementsForSlide(dest) {
    const elements = [];
    if (dest === "homePage") {
        elements.push(
            document.getElementById("barraLogo"),
            document.getElementById("selezioneLinguaBarra"),
            document.getElementById("selModalita"),
            document.getElementById("footer")
        );
    } else if (dest === "vocabolario") {
        elements.push(
            document.getElementById("barraLogo"),
            document.getElementById("selezioneLinguaBarra"),
            document.getElementById("vocabolario"),
            document.getElementById("footer")
        );
    } else if (dest === "contatti") {
        elements.push(
            document.getElementById("barraLogo"),
            document.getElementById("selezioneLinguaBarra"),
            document.getElementById("contatti"),
            document.getElementById("footer")
        );
    } else if (dest === "selDifficolta") {
        elements.push(
            document.getElementById("barraLogo"),
            document.getElementById("selDifficolta"),
            document.getElementById("footer")
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

function funzuioneTraduzione() {
    toSlide("traduzione");
}