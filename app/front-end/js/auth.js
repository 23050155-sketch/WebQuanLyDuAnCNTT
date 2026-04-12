// Khởi tạo khi load trang
document.addEventListener("DOMContentLoaded", () => {
    updateUI();
    setupEventListeners();
});

// Cập nhật UI dựa trên trạng thái đăng nhập
function updateUI() {
    const user = getUserInfo();
    const userNameDisplay = document.getElementById("userNameDisplay");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    
    if (user) {
        if (userNameDisplay) userNameDisplay.textContent = `👋 Xin chào, ${user.fullname}`;
        if (loginBtn) loginBtn.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "inline-block";
    } else {
        if (userNameDisplay) userNameDisplay.textContent = "";
        if (loginBtn) loginBtn.style.display = "inline-block";
        if (logoutBtn) logoutBtn.style.display = "none";
    }
}

// Setup event listeners
function setupEventListeners() {
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const createProjectBtn = document.getElementById("createProjectBtn");
    const joinProjectBtn = document.getElementById("joinProjectBtn");
    
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            window.location.href = "login.html";
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await logout();
        });
    }
    
    if (createProjectBtn) {
        createProjectBtn.addEventListener("click", () => {
            if (isAuthenticated()) {
                window.location.href = "create-project.html";
            } else {
                alert("Vui lòng đăng nhập để tạo dự án!");
                window.location.href = "login.html";
            }
        });
    }
    
    if (joinProjectBtn) {
        joinProjectBtn.addEventListener("click", async () => {
            const projectCode = document.getElementById("projectCode").value.trim();
            const errorDiv = document.getElementById("joinError");
            
            if (!projectCode) {
                errorDiv.textContent = "Vui lòng nhập mã dự án!";
                return;
            }
            
            if (!isAuthenticated()) {
                alert("Vui lòng đăng nhập để tham gia dự án!");
                window.location.href = "login.html";
                return;
            }
            
            try {
                // Kiểm tra project tồn tại
                const project = await getProject(projectCode);
                
                // Kiểm tra user có trong project không
                const hasAccess = await checkProjectAccess(projectCode);
                
                if (hasAccess) {
                    // Lưu project code vào session
                    sessionStorage.setItem("currentProject", projectCode);
                    window.location.href = `project-detail.html?code=${projectCode}`;
                } else {
                    errorDiv.textContent = "Bạn không phải là thành viên của dự án này!";
                }
            } catch (error) {
                errorDiv.textContent = "Mã dự án không hợp lệ!";
            }
        });
    }
}

// Xử lý đăng nhập (cho login.html)
if (document.getElementById("loginForm")) {
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const errorDiv = document.getElementById("loginError");
        
        try {
            const user = await login(username, password);
            
            if (user.role === "admin" || user.role === "member" || user.role === "expert") {
                window.location.href = "index.html";
            } else {
                errorDiv.textContent = "Bạn không có quyền truy cập!";
            }
        } catch (error) {
            errorDiv.textContent = error.message;
        }
    });
}