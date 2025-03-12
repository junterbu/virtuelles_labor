import * as THREE from "three";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { getUserData } from "./main.js"; // Falls noch nicht importiert
import { sendQuizAnswer } from "./main.js";

// Firestore-Instanz holen
const db = window.firebaseDB;



// Funktion zum Erstellen eines Markers
function createMarker(h, b, pxx, pxz, text, x, y, z, r) {
    const geometry = new THREE.PlaneGeometry(b, h);
    const material = new THREE.MeshStandardMaterial({ color: 0xbebdb8, side: THREE.DoubleSide });
    
    // Canvas für den Text
    const canvas = document.createElement('canvas');
    canvas.width = pxx;
    canvas.height = pxz;
    const context = canvas.getContext('2d');
    context.font = '50px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    material.map = new THREE.CanvasTexture(canvas);
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.y = Math.PI*r;
    marker.position.set(x, y, z);
    
    return marker;
}

export const proberaumlagerMarker = createMarker(0.5, 1, 256, 128, "zum Lager", 4, 1.5, -10, 1);
export const lagerMarker = createMarker(1, 2, 256, 128, "Start", -12, 10, 4, 0);
// export const proberaumMarker = createMarker(1, 2, 256, 128, "Proberaum", 6.3, 10, -15, 0);
export const leavelagerMarker = createMarker(0.5, 2, 512, 128, "zur Übersicht", -12.5, 1.5, -2, 0);
export const leaveproberaumMarker = createMarker(0.5, 2, 512, 128, "zur Übersicht", 2, 1.5, -10, 1);
export const lagerproberaumMarker = createMarker(0.5, 2, 512, 128, "zum Gesteinsraum", -12.5, 1.5, 8, 1);
export const toMischraumMarker = createMarker(0.5, 1.5, 384, 128, "zum Mischer", 6, 1.5, -10, 1);
export const leaveMischraum = createMarker(0.5, 1.5, 512, 128, "zur Übersicht", -3, 1.5, 6, 1.5);
export const toMarshallMarker = createMarker(0.5, 1, 640, 128, "zum Marshall-Verdichter", -8, 2, 4.5, 2)
export const leaveMarshall = createMarker(0.5, 1.5, 512, 128, "zur Übersicht", -3, 1.5, 3, 1.5);
// export let totalProzentMesh = createMarker(1, 0.5, 256, 128, "Total: 0%", 8, 2, -16.75, -2);

export let markers = [lagerMarker, leaveproberaumMarker, proberaumlagerMarker, lagerproberaumMarker, leavelagerMarker, leaveMischraum, toMarshallMarker, leaveMarshall];  // Die Marker-Objekte
export let activeMarkers = [lagerMarker, leaveproberaumMarker, proberaumlagerMarker, lagerproberaumMarker, leavelagerMarker, leaveMischraum, toMarshallMarker, leaveMarshall];  // Die aktiven Marker (wird leer sein, wenn in einem Viewpoint)

lagerproberaumMarker.visible = false;
toMarshallMarker.visible = false;

export let quizPunkte = 0;
export const quizFragen = {
    "Gesteinsraum": {
        frage: "Welche Aussage zur CE-Kennzeichnung von Asphaltmischgut ist korrekt?",
        optionen: ["Sie garantiert eine hohe Qualität des Produkts", "Sie zeigt an, dass gesetzliche Vorschriften eingehalten wurden", "Sie ist nur für importierte Baustoffe erforderlich", "Sie wird nur auf Wunsch des Herstellers vergeben"],
        antwort: "Sie zeigt an, dass gesetzliche Vorschriften eingehalten wurden",
        punkte: 10
    },
    "Gesteinsraum_2": {
        frage: "Mit welchem volumetrischen Kennwerte wird die maximale Dichte eines Asphaltmischguts ohne Hohlräume beschrieben?",
        optionen: ["Raumdichte", "Rohdichte", "Schüttdichte", "lose Dichte"],
        antwort: "Rohdichte",
        punkte: 10
    },
    "Mischer": {
        frage: "Warum ist eine Typprüfung von Asphaltmischgut notwendig?",
        optionen: ["Um den richtigen Mischguttyp für eine Baustelle zu ermitteln", "Um das Erfüllen der normgemäßen Anforderungen nachzuweisen", "Um die optimale Temperatur für das Mischen festzulegen", "Um den Recyclinganteil im Asphalt zu bestimmen"],
        antwort: "Um das Erfüllen der normgemäßen Anforderungen nachzuweisen",
        punkte: 10
    },
    "Marshall": {
        frage: "Wie wird der optimale Bindemittelgehalt eines dichten Asphaltmischguts ermittelt?",
        optionen: ["Durch eine rechnerische Ableitung der Sieblinie", "Durch Erhitzen des Mischguts auf eine festgelegte Temperatur", "Durch Erstellen einer Polynomfunktion und Finden des Maximums der Raumdichten", "Durch Zugabe von Bindemittel in 1%-Schritten und Sichtprüfung"],
        antwort: "Durch Erstellen einer Polynomfunktion und Finden des Maximums der Raumdichten",
        punkte: 10
    }
};

async function getDatabase() {
    while (!window.firebaseDB) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Warten, bis Firebase geladen ist
    }
    return window.firebaseDB;
}

// Lade gespeicherte User-ID oder zeige das Eingabefeld
let userId = localStorage.getItem("userId");

if (!userId) {
    document.getElementById("userIdContainer").style.display = "block"; // Eingabe anzeigen
}

function setUserId() {
    const userId = document.getElementById("userIdInput").value.trim();

    if (userId === "") {
        alert("Bitte eine gültige Matrikelnummer eingeben.");
        return;
    }

    localStorage.setItem("userId", userId);
    document.getElementById("userIdContainer").style.display = "none"; // Eingabemaske ausblenden
}

let beantworteteRäume = new Set();

export async function zeigeQuiz(raum, zweiteFrage = false) {
    const userId = localStorage.getItem("userId");

    if (!userId) {
        alert("Bitte zuerst eine Matrikelnummer eingeben.");
        document.getElementById("userIdContainer").style.display = "block";
        return;
    }

    const userData = await getUserData(userId);

    if (!userData || !userData.beantworteteRäume) {
        userData.beantworteteRäume = [];
    }

    // Überprüfen, ob die erste oder zweite Frage dran ist
    let quizKey = zweiteFrage ? `${raum}_2` : raum;
    if (!quizFragen[quizKey]) {
        console.warn("⚠️ Kein Quiz für", quizKey);
        return;
    }

    document.getElementById("quizFrage").innerText = quizFragen[quizKey].frage;
    const optionenContainer = document.getElementById("quizOptionen");
    optionenContainer.innerHTML = "";

    let gemischteOptionen = [...quizFragen[quizKey].optionen].sort(() => Math.random() - 0.5);

    gemischteOptionen.forEach(option => {
        const button = document.createElement("button");
        button.innerText = option;
        button.classList.add("quiz-option");

        button.addEventListener("click", async () => {
            button.style.backgroundColor = "#0000ff"; // Bestätigung
            button.style.color = "white";

            await sendQuizAnswer(userId, raum, option);

            setTimeout(() => {
                button.style.backgroundColor = "#007bff"; // Zurück zur Standardfarbe
                button.style.color = "white";

                // Falls es das erste Quiz war, das zweite starten
                if (!zweiteFrage) {
                    zeigeQuiz(raum, true);
                } else {
                    schließeQuiz();
                }
            }, 1000);
        });

        optionenContainer.appendChild(button);
    });

    document.getElementById("quizContainer").style.display = "block";
}

export async function speicherePunkte(raum, auswahl) {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const docRef = doc(db, "quizErgebnisse", userId);
    const docSnap = await getDoc(docRef);

    let quizPunkteNeu = 0;
    let beantworteteRäume = [];

    if (docSnap.exists()) {
        beantworteteRäume = docSnap.data().beantworteteRäume || [];
        quizPunkteNeu = docSnap.data().punkte || 0;
    }

    let quizKey = raum.includes("_2") ? raum : `${raum}`;  // Erkennen von _2-Fragen

    if (!beantworteteRäume.includes(quizKey)) {
        if (quizFragen[quizKey].antwort === auswahl) {
            quizPunkteNeu += quizFragen[quizKey].punkte;
        }
        beantworteteRäume.push(quizKey);
    }

    await setDoc(docRef, {
        punkte: quizPunkteNeu,
        beantworteteRäume: beantworteteRäume
    });

    console.log(`📌 Punkte für ${quizKey} gespeichert: ${quizPunkteNeu}`);
}

function schließeQuiz() {
    document.getElementById("quizContainer").style.display = "none";
}

window.setUserId = setUserId;

// // Marker für den Proberaum zum Lagerraum
// let proberaumlagerMarkerGeometry = new THREE.PlaneGeometry(1, 0.5);
// let proberaumlagerMarkerMaterial = new THREE.MeshStandardMaterial({ color: 0xbebdb8 ,side: THREE.DoubleSide })  

// // Text Canvas erstellen
// let canvas_Probe_Lager = document.createElement('canvas');
// canvas_Probe_Lager.width = 256;  // Breite des Canvas
// canvas_Probe_Lager.height = 128;  // Höhe des Canvas
// let context_Probe_Lager = canvas_Probe_Lager.getContext('2d');
// context_Probe_Lager.font = '50px Arial';
// context_Probe_Lager.fillStyle = 'white';

// // Textausrichtung und Basislinie setzen, um Text zu zentrieren
// context_Probe_Lager.textAlign = 'center';  // Horizontal zentriert
// context_Probe_Lager.textBaseline = 'middle';  // Vertikal zentriert

// context_Probe_Lager.fillText("zum Lager", canvas_Probe_Lager.width / 2, canvas_Probe_Lager.height / 2);  // Text

// let texture_Probe_Lager = new THREE.CanvasTexture(canvas_Probe_Lager);
// proberaumlagerMarkerMaterial.map = texture_Probe_Lager;

// let proberaumlagerMarker = new THREE.Mesh(proberaumlagerMarkerGeometry, proberaumlagerMarkerMaterial);
// proberaumlagerMarker.rotation.y = Math.PI;
// proberaumlagerMarker.position.set(4, 1.5, -10);  // Setze den Marker an die gewünschte Position im Proberaum
// scene.add(proberaumlagerMarker);