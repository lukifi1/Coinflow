document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registerForm");
    //Pasword hashing vio crypto api
    async function hashPassword(password) {
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fullName = form.fullName.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        const termsAccepted = form.terms.checked;

        if (!termsAccepted) {
            alert("You must accept the Terms of Service.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        try {
            const password_hash = await hashPassword(password);

            const response = await fetch("/api/user/new", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: fullName,
                    email: email,
                    password_hash: password_hash
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Registration successful:", data);
                alert("Account created successfully!");
                window.location.href = "/login.html";
            } else {
                console.error("Registration error:", data);
                alert(data.message || data.error || "Registration failed.");
            }
        } catch (err) {
            console.error("Network error:", err);
            alert("Something went wrong. Try again later.");
        }
    });
});