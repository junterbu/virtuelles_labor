const BACKEND_URL = "https://virtuelles-labor-backend.vercel.app";

async function sendDataToServer(userId, data) {
    const response = await fetch(`${BACKEND_URL}/api/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, data })
    });

    const result = await response.json();
    console.log(result);
}

export async function getUserData(userId) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/data/${userId}`);
        if (!response.ok) throw new Error("Fehler beim Abrufen der Daten");

        const data = await response.json();
        if (!data || typeof data !== "object") {
            console.error("⚠️ Ungültige Datenstruktur:", data);
            return {}; // Rückgabe eines leeren Objekts, um undefined zu vermeiden
        }

        console.log("✅ Empfangene Benutzerdaten:", data);
        return data;
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Benutzerdaten:", error);
        return {}; // Rückgabe eines leeren Objekts, um Fehler zu vermeiden
    }
}

export async function sendQuizAnswer(userId, raum, auswahl) {
    try {
        let quizKey = raum.includes("_2") ? raum : `${raum}`; // Prüft, ob es eine zweite Frage ist

        console.log(`📤 Sende Quiz-Daten an Backend: ${userId}, ${quizKey}, ${auswahl}`);

        const response = await fetch(`${BACKEND_URL}/api/quiz`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, raum: quizKey, auswahl }) 
        });

        const result = await response.json();
        console.log(`✅ Antwort vom Backend für ${quizKey}:`, result);

    } catch (error) {
        console.error("❌ Fehler in sendQuizAnswer:", error);
    }
}