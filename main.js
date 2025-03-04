async function sendDataToServer(userId, data) {
    const response = await fetch("http://localhost:5000/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, data })
    });

    const result = await response.json();
    console.log(result);
}

// Beispiel für das Abrufen von Daten
async function getUserData(userId) {
    const response = await fetch(`http://localhost:5000/api/data/${userId}`);
    const data = await response.json();
    console.log(data);
}

// Testaufruf
sendDataToServer("123456", { score: 100 });
getUserData("123456");