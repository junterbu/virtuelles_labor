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
        const response = await fetch(`${BACKEND_URL}/api/quiz`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, raum, auswahl })
        });

        if (!response.ok) {
            throw new Error(`Fehler beim Senden der Quiz-Antwort: ${response.status}`);
        }

        const result = await response.json();
        console.log("✅ Quiz gespeichert:", result);
    } catch (error) {
        console.error("❌ Fehler in sendQuizAnswer:", error);
    }
}

export async function getUserQuizFragen(userId) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/quizfragen/${userId}`);
        if (!response.ok) throw new Error("Fehler beim Abrufen der Quizfragen");

        const data = await response.json();
        console.log("✅ Fragen für den Nutzer geladen:", data.fragen);
        return data.fragen;
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Fragen:", error);
        return [];
    }
}

export async function getUserBeantworteteFragen(userId) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/quizErgebnisse/${userId}`);
        if (!response.ok) throw new Error("Fehler beim Abrufen der beantworteten Fragen");

        const data = await response.json();
        console.log("✅ Bereits beantwortete Fragen geladen:", data.ergebnisse);

        // Extrahiere die Räume aus den gespeicherten Quiz-Ergebnissen
        return data.ergebnisse.map(q => q.raum) || [];
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der beantworteten Fragen:", error);
        return [];
    }
}

export async function getNextTwoQuestions(userId) {
    try {
        const nutzerFragen = await getUserQuizFragen(userId);
        const beantworteteFragen = await getUserBeantworteteFragen(userId);

        // Finde die nächsten zwei unbeantworteten Fragen
        const offeneFragen = nutzerFragen.filter(f => !beantworteteFragen.includes(f)).slice(0, 2);
        return offeneFragen;
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der nächsten zwei Fragen:", error);
        return [];
    }
}