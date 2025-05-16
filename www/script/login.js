document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    // Same hash as in register.js
    async function hashPassword(password) {
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }


    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = form.email.value.trim();
        const password = form.password.value;
        const rememberMe = form.remember.checked;

// Implement real hashing later (server-side or client-side?)
        const password_hash = await hashPassword(password);

        try {
            const response = await fetch("/api/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password_hash }),
            });

            const data = await response.json();

            if (response.ok) {
                const storage = rememberMe ? localStorage : sessionStorage;
                

                storage.setItem("session_token", data.token);
                storage.setItem("user_uuid", data.uuid);

                window.location.href = "/dashboard.html";
            } else {
                alert(data.error || "Login failed.");
            }
        } catch (err) {
            console.error("Login error:", err);
            alert("Login failed. Try again later.");
        }
    });
});