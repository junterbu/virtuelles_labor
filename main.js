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

async function getUserData(userId) {
    const response = await fetch(`${BACKEND_URL}/api/data/${userId}`);
    const data = await response.json();
    console.log(data);
}

async function sendQuizAnswer(userId, raum, auswahl) {
    const response = await fetch(`${BACKEND_URL}/api/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, raum, auswahl })
    });

    const result = await response.json();
    console.log("Quiz gespeichert:", result);
}