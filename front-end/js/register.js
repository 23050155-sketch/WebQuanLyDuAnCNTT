// register.js
const API_BASE_URL = "http://127.0.0.1:8000";

// Lấy các element
const registerForm = document.getElementById("registerForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const fullnameInput = document.getElementById("fullname");
const emailInput = document.getElementById("email");
const hourlyRateInput = document.getElementById("hourlyRate");
const errorDiv = document.getElementById("formError");
const successDiv = document.getElementById("formSuccess");
const submitBtn = document.getElementById("submitBtn");

// Validation functions
function validateUsername(username) {
    if (username.length < 3) {
        return "Tên đăng nhập phải có ít nhất 3 ký tự";
    }
    if (username.length > 50) {
        return "Tên đăng nhập không được quá 50 ký tự";
    }
    return null;
}

function validatePassword(password) {
    if (password.length < 6) {
        return "Mật khẩu phải có ít nhất 6 ký tự";
    }
    return null;
}

function validateFullname(fullname) {
    if (fullname.length < 2) {
        return "Họ và tên phải có ít nhất 2 ký tự";
    }
    return null;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return "Email không hợp lệ";
    }
    return null;
}

function validateHourlyRate(rate) {
    if (rate < 0) {
        return "Mức lương không thể âm";
    }
    return null;
}

// Real-time validation
usernameInput.addEventListener("input", () => {
    const error = validateUsername(usernameInput.value);
    if (error) {
        usernameInput.classList.add("error");
    } else {
        usernameInput.classList.remove("error");
    }
});

passwordInput.addEventListener("input", () => {
    const error = validatePassword(passwordInput.value);
    if (error) {
        passwordInput.classList.add("error");
    } else {
        passwordInput.classList.remove("error");
    }
});

confirmPasswordInput.addEventListener("input", () => {
    if (confirmPasswordInput.value !== passwordInput.value) {
        confirmPasswordInput.classList.add("error");
    } else {
        confirmPasswordInput.classList.remove("error");
    }
});

emailInput.addEventListener("input", () => {
    const error = validateEmail(emailInput.value);
    if (error) {
        emailInput.classList.add("error");
    } else {
        emailInput.classList.remove("error");
    }
});

// Submit form
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const fullname = fullnameInput.value.trim();
    const email = emailInput.value.trim();
    const hourlyRate = parseFloat(hourlyRateInput.value) || 0;
    
    // Validate all fields
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    const fullnameError = validateFullname(fullname);
    const emailError = validateEmail(email);
    const hourlyRateError = validateHourlyRate(hourlyRate);
    
    if (usernameError) {
        errorDiv.textContent = usernameError;
        return;
    }
    
    if (passwordError) {
        errorDiv.textContent = passwordError;
        return;
    }
    
    if (password !== confirmPassword) {
        errorDiv.textContent = "Mật khẩu xác nhận không khớp!";
        return;
    }
    
    if (fullnameError) {
        errorDiv.textContent = fullnameError;
        return;
    }
    
    if (emailError) {
        errorDiv.textContent = emailError;
        return;
    }
    
    if (hourlyRateError) {
        errorDiv.textContent = hourlyRateError;
        return;
    }
    
    const userData = {
        username: username,
        password: password,
        fullname: fullname,
        email: email,
        role: "member",
        hourly_rate: hourlyRate
    };
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Đang xử lý...";
    errorDiv.textContent = "";
    successDiv.textContent = "";
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || "Đăng ký thất bại");
        }
        
        successDiv.textContent = "✅ Đăng ký thành công! Chuyển hướng đến trang đăng nhập...";
        
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        
    } catch (error) {
        errorDiv.textContent = error.message;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "✅ Đăng ký";
    }
});