function toSlide(dest) {
    // Tutti gli elementi delle slide
    const slides = document.querySelectorAll(".slide");

    // Nascondi tutte le slide
    slides.forEach(slide => {
        slide.style.display = "none";
    });

    // Call disableCam if the current slide is "traduzione"
    if (document.getElementById("traduzione").style.display === "block") {
        disableCam();
    }

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