document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = form.email.value.trim();
        const password = form.password.value;
        const rememberMe = form.remember.checked;

        try {
            const response = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                const storage = rememberMe ? localStorage : sessionStorage;
                

                storage.setItem("session_token", data.token);
                storage.setItem("user_uuid", data.user.uuid);
                storage.setItem("username", data.user.username);

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