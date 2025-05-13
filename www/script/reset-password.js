document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetForm");
  const messageBox = document.getElementById("messageBox");
  const submitButton = form.querySelector("button");

  const showMessage = (message, type) => {
    messageBox.textContent = message;
    messageBox.className = `message ${type}`;
  };

  const showLoading = () => {
    document.documentElement.style.cursor = "wait";
    submitButton.disabled = true;
  };

  const resetLoading = () => {
    document.documentElement.style.cursor = "default";
    submitButton.disabled = false;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = form.email.value.trim();
    messageBox.textContent = "";
    messageBox.className = "";

    if (!email) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    // ✅ Let browser render the loading cursor first
    showLoading();

    // ✅ Force cursor render with a tiny delay
    setTimeout(async () => {
      try {
        submitButton.textContent = "Sending...";
        const res = await fetch("/auth/request-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (res.ok) {
          let seconds = 5;
          showMessage(`Reset link sent. Redirecting to login in ${seconds} seconds...`, "success");
          form.reset();

          const countdown = setInterval(() => {
            seconds--;
            showMessage(`Reset link sent. Redirecting to login in ${seconds} seconds...`, "success");

            if (seconds <= 0) {
              clearInterval(countdown);
              window.location.href = "/login.html";
            }
          }, 1000);
        } else {
          showMessage(data.error || "Something went wrong.", "error");
        }
      } catch (err) {
        console.error("Network error:", err);
        showMessage("Could not send request. Please try again later.", "error");
      } finally {
        resetLoading();
      }
    }, 10); // ✅ 10ms gives browser enough time to paint the cursor
  });
});