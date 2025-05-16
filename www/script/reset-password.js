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
        console.log("Sending reset request for email:", email);
        
        const res = await fetch("/api/user/request_password_reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        
        console.log("Response status:", res.status);
        
        // Get text first to safely handle non-JSON responses
        const responseText = await res.text();
        console.log("Raw response:", responseText);
        
        // Only parse as JSON if we have content
        let data = {};
        if (responseText) {
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            console.error("Invalid JSON response:", e);
            // Still show success if status was OK
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
              return;
            } else {
              showMessage("Server returned invalid response. Please try again later.", "error");
              return;
            }
          }
        }

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
          showMessage(data.message || data.error || "Something went wrong.", "error");
        }
      } catch (err) {
        console.error("Network error:", err);
        showMessage("Could not send request. Please try again later.", "error");
      } finally {
        resetLoading();
        submitButton.textContent = "Send Reset Link";
      }
    }, 10); // ✅ 10ms gives browser enough time to paint the cursor
  });
});