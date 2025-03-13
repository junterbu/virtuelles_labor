import { solveLinearSystem, invertMatrix, multiplyMatrixVector } from "./Marshall.js";
import { quizPunkte, quizFragen } from "./Marker.js";

const BACKEND_URL = "https://virtuelles-labor-backend.vercel.app";

async function fetchQuizPunkte(userId) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/punkte/${userId}`);
        const data = await response.json();
        return data.punkte || 0;
    } catch (error) {
        console.error("Fehler beim Abrufen der Punkte:", error);
        return 0;
    }
}

async function fetchQuizResults(userId) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/quizErgebnisse/${userId}`);
        const data = await response.json();
        return data.ergebnisse || [];
    } catch (error) {
        console.error("Fehler beim Abrufen der Quiz-Ergebnisse:", error);
        return [];
    }
}

export async function generatePDFReport(mischgutName, eimerWerte, bitumengehalt, Rohdichten, raumdichten, sieblinieCanvas) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    let startY = 10;
    const userId = localStorage.getItem("userId") || "Gast";

    // Quiz-Punkte abrufen
    const quizPunkte = await fetchQuizPunkte(userId);

    // Titel
    pdf.setFontSize(20);
    pdf.text("Virtueller Laborbericht", 105, startY, { align: "center" });
    startY += 10;

    // Mischgut
    pdf.setFontSize(16);
    pdf.text(`Asphaltmischung: ${mischgutName}`, 10, startY);
    startY += 10;

    // Eimerwerte Tabelle
    pdf.text("Gesteinssieblinie [%]:", 10, startY);
    startY += 5;

    const eimerHeaders = ["Füller", "0/2", "2/4", "4/8", "8/11", "11/16", "16/22", "22/32"];
    const eimerData = [Object.values(eimerWerte)];
    pdf.autoTable({
        startY,
        head: [eimerHeaders],
        body: eimerData,
    });
    startY = pdf.lastAutoTable.finalY + 10;

    // Sieblinie
    if (sieblinieCanvas) {
        pdf.text("Sieblinie:", 10, startY);
        startY += 5;
        const sieblinieImage = sieblinieCanvas.toDataURL("image/png");
        pdf.addImage(sieblinieImage, "PNG", 10, startY, 180, 100);
    }

    startY += 100;

    // Bindemittel und Rohdichten
    pdf.text("Bindemittelgehalt [%]:", 10, startY);
    startY += 5;

    const biHeaders = ["Bitumengehalt 1", "Bitumengehalt 2", "Bitumengehalt 3"];
    const biData = [bitumengehalt.flat()];
    pdf.autoTable({
        startY,
        head: [biHeaders],
        body: biData,
    });
    startY = pdf.lastAutoTable.finalY + 10;

    // Bindemittel und Rohdichten
    pdf.text("Rohdichten [g/cm³]:", 10, startY);
    startY += 5;

    const rohHeaders = ["Rohdichte 1", "Rohdichte 2", "Rohdichte 3"];
    const rohData = [Rohdichten.flat()];
    pdf.autoTable({
        startY,
        head: [rohHeaders],
        body: rohData,
    });

    // ---- Wechsel auf eine neue Seite für den Plot ----
    pdf.addPage();
    startY = 10; // Y-Position zurücksetzen

    pdf.setFontSize(16);
    pdf.text("Virtueller Laborbericht", 105, startY, { align: "center" });
    startY += 10;

    // Raumdichten
    pdf.setFontSize(12)
    pdf.text("Raumdichten [g/cm³]:", 10, startY);
    startY += 5;

    const raumHeaders = ["R1-1", "R1-2", "R1-3", "R1-4", "R2-1", "R2-2", "R2-3", "R2-4", "R3-1", "R3-2", "R3-3", "R3-4"];
    const raumData = [raumdichten.flat()];
    pdf.autoTable({
        startY,
        head: [raumHeaders],
        body: raumData,
    });
    startY = pdf.lastAutoTable.finalY + 10;

    // Scatterplot als Canvas generieren
    const scatterCanvas = document.createElement("canvas");
    scatterCanvas.width = 400;
    scatterCanvas.height = 300;
    document.body.appendChild(scatterCanvas);

    const ctx = scatterCanvas.getContext("2d");

    function berechneMittelwerte(raumdichten) {
        return raumdichten.map(row => {
            const sum = row.reduce((acc, val) => acc + parseFloat(val), 0);
            return (sum / row.length).toFixed(3); // Mittelwert berechnen & auf 3 Nachkommastellen runden
        });
    }

    let mittelwert = berechneMittelwerte(raumdichten)

    function findPoint(raumdichten, bitumengehalt) {
        let Ax = bitumengehalt[0];
        let Bx = bitumengehalt[1];
        let Cx = bitumengehalt[2];

        

        let Ay = raumdichten[0];
        let By = raumdichten[1];
        let Cy = raumdichten[2];

     
        // Erstelle die Matrix A und den Vektor B
        let A = [
            [Ax ** 2, Ax, 1],
            [Bx ** 2, Bx, 1],
            [Cx ** 2, Cx, 1]
        ];
        let B = [Ay, By, Cy];
    
        // Löse das lineare Gleichungssystem Ax = B für x (also für a, b, c)
        let [a, b, c] = solveLinearSystem(A, B);
        return [a,b,c];
    }

    const trendData = [];
    let [a,b,c] = findPoint(mittelwert, bitumengehalt);
    for (let x = 3; x <= 7; x += 0.1) {
        trendData.push({
            x,
            y: a * x ** 2 + b * x + c
        });
    }

    new Chart(ctx, {
        type: "scatter",
        data: {
            datasets: [
                {
                    label: "Raumdichte [g/cm³]",
                    data: bitumengehalt.map((b, i) => ({
                        x: b,
                        y: mittelwert[i]
                    })),
                    backgroundColor: "blue",
                    pointRadius: 6
                },
                {
                    label: "Trendlinie",
                    data: trendData,
                    borderColor: "grey",
                    borderWidth: 3,
                    borderDash: [1, 1], // Punktierte Linie
                    fill: false,
                    type: "line",
                    pointRadius: 0
                }
            ]
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 18 // Größere Schriftgröße für die Legende
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { 
                        display: true, 
                        text: "Bitumengehalt [%]",
                        font: {
                            size: 18 // Größere Schriftgröße für X-Achse
                        }
                    },
                    ticks: {
                        font: {
                            size: 16 // Größere Wertebeschriftung auf der X-Achse
                        }
                    },
                    min: 3,
                    max: 7
                },
                y: {
                    title: { 
                        display: true, 
                        text: "Raumdichte [g/cm³]",
                        font: {
                            size: 18 // Größere Schriftgröße für Y-Achse
                        }
                    },
                    ticks: {
                        font: {
                            size: 16 // Größere Wertebeschriftung auf der Y-Achse
                        }
                    },
                    min: 2.1,
                    max: 2.7
                }
            }
        }
    });

    // Warten, bis der Chart gezeichnet wurde
    setTimeout(() => {
        const image = scatterCanvas.toDataURL("image/png");
        pdf.text("Optimaler Bitumengehalt:", 10, startY);
        startY += 5;
        pdf.addImage(image, "PNG", 10, startY, 180, 100);

        // Entfernen des temporären Canvas
        document.body.removeChild(scatterCanvas);
        startY += 120;

        // Quiz-Ergebnisse Tabelle
        pdf.setFontSize(14);
        pdf.text("Quiz-Auswertung:", 10, startY);
        startY += 5;

        const quizHeaders = ["Frage", "Antwort des Nutzers", "Richtige Antwort", "Punkte"];
        const quizData = quizErgebnisse.map(q => [q.frage, q.gegebeneAntwort, q.richtigeAntwort, q.punkte]);

        pdf.autoTable({
            startY,
            head: [quizHeaders],
            body: quizData,
            styles: { fontSize: 10 }
        });

        startY = pdf.lastAutoTable.finalY + 10;

        pdf.text(`Gesamtpunkte: ${quizPunkte} / 80`, 10, startY);

        // PDF speichern
        pdf.save("Laborbericht.pdf");
    }, 500);

    
}