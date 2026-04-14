// Xử lý tạo project (cho create-project.html)
if (document.getElementById("createProjectForm")) {
    if (!isAuthenticated()) {
        window.location.href = "login.html";
    }
    
    document.getElementById("createProjectForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const user = getUserInfo();
        const projectData = {
            project_id: document.getElementById("project_id").value,
            project_name: document.getElementById("project_name").value,
            department: document.getElementById("department").value,
            description: document.getElementById("description").value,
            created_by: user.user_id,
            start_date: document.getElementById("start_date").value || null,
            end_date: document.getElementById("end_date").value || null,
            status: document.getElementById("status").value,
            total_budget: parseFloat(document.getElementById("total_budget").value) || 0
        };
        
        const errorDiv = document.getElementById("formError");
        const successDiv = document.getElementById("formSuccess");
        
        // Disable nút submit
        const submitBtn = document.querySelector("#createProjectForm button[type='submit']");
        if (submitBtn) submitBtn.disabled = true;
        
        try {
            const result = await createProject(projectData);
            successDiv.textContent = "✅ Tạo dự án thành công!";
            errorDiv.textContent = "";
            
            // ❌ XÓA HOẶC COMMENT DÒNG NÀY
            // await addProjectMember(projectData.project_id, user.user_id, "manager");
            
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
            
        } catch (error) {
            console.error("Create project error:", error);
            errorDiv.textContent = error.message || "Có lỗi xảy ra khi tạo dự án";
            successDiv.textContent = "";
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

// Hiển thị danh sách dự án của tôi (cho index.html)
if (document.getElementById("myProjectsList")) {
    loadMyProjects();
}

async function loadMyProjects() {
    const container = document.getElementById("myProjectsList");
    
    if (!isAuthenticated()) {
        container.innerHTML = '<p style="text-align:center; color:#666;">Đăng nhập để xem dự án của bạn</p>';
        return;
    }
    
    try {
        const members = await getMyProjects();
        
        if (members.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#666;">Bạn chưa tham gia dự án nào</p>';
            return;
        }
        
        // Lấy thông tin chi tiết từng project
        const projects = [];
        for (const member of members) {
            try {
                const project = await getProject(member.project_id);
                projects.push({ ...project, role: member.role_in_project });
            } catch (e) {
                console.error(e);
            }
        }
        
        container.innerHTML = projects.map(project => `
            <div class="project-card" onclick="viewProject('${project.project_id}')">
                <div class="project-code">📁 ${project.project_id}</div>
                <h3>${project.project_name}</h3>
                <p>🏢 ${project.department}</p>
                <p>🎭 Vai trò: ${getRoleName(project.role)}</p>
                <span class="project-status status-${project.status}">${getStatusName(project.status)}</span>
            </div>
        `).join("");
        
    } catch (error) {
        console.error("Error loading projects:", error);
        container.innerHTML = '<p style="text-align:center; color:#dc3545;">Lỗi tải dự án</p>';
    }
}

function viewProject(projectCode) {
    sessionStorage.setItem("currentProject", projectCode);
    window.location.href = `project-detail.html?code=${projectCode}`;
}

function getRoleName(role) {
    const roles = {
        "manager": "👔 Quản lý",
        "developer": "💻 Developer",
        "tester": "🧪 Tester",
        "expert": "🎓 Chuyên gia",
        "viewer": "👁️ Xem"
    };
    return roles[role] || role;
}

function getStatusName(status) {
    const statuses = {
        "planning": "📋 Lên kế hoạch",
        "in_progress": "⚙️ Đang thực hiện",
        "completed": "✅ Hoàn thành",
        "cancelled": "❌ Đã hủy"
    };
    return statuses[status] || status;
}

// Xử lý chi tiết project (cho project-detail.html)
if (window.location.pathname.includes("project-detail.html")) {
    const urlParams = new URLSearchParams(window.location.search);
    const projectCode = urlParams.get("code") || sessionStorage.getItem("currentProject");
    
    if (!projectCode) {
        window.location.href = "index.html";
    }
    
    loadProjectDetail(projectCode);
}

async function loadProjectDetail(projectCode) {
    try {
        // Kiểm tra quyền truy cập
        const hasAccess = await checkProjectAccess(projectCode);
        if (!hasAccess) {
            alert("Bạn không có quyền truy cập dự án này!");
            window.location.href = "index.html";
            return;
        }
        
        // Load thông tin project
        const project = await getProject(projectCode);
        document.getElementById("projectTitle").textContent = `📊 ${project.project_name}`;
        
        document.getElementById("projectInfo").innerHTML = `
            <div class="project-info-card">
                <div class="info-row">
                    <span class="info-label">Mã dự án:</span>
                    <span class="info-value">${project.project_id}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Tên dự án:</span>
                    <span class="info-value">${project.project_name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phòng ban:</span>
                    <span class="info-value">${project.department}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Mô tả:</span>
                    <span class="info-value">${project.description || "Không có"}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Thời gian:</span>
                    <span class="info-value">${project.start_date || "?"} → ${project.end_date || "?"}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Ngân sách:</span>
                    <span class="info-value">${formatCurrency(project.total_budget)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Trạng thái:</span>
                    <span class="info-value status-${project.status}">${getStatusName(project.status)}</span>
                </div>
            </div>
        `;
        
        // Load các tab
        await loadTasks(projectCode);
        await loadMembers(projectCode);
        await loadCostEstimates(projectCode);
        
        // Setup tab switching
        setupTabs();
        
    } catch (error) {
        console.error("Error loading project:", error);
        alert("Không thể tải thông tin dự án!");
    }
}

async function loadTasks(projectCode) {
    try {
        const tasks = await getProjectTasks(projectCode);
        const container = document.getElementById("tasksList");
        
        if (tasks.length === 0) {
            container.innerHTML = '<p class="empty-message">Chưa có công việc nào</p>';
            return;
        }
        
        container.innerHTML = tasks.map(task => `
            <div class="task-item">
                <div>
                    <strong>${task.task_name}</strong>
                    <p class="task-desc">${task.description || "Không có mô tả"}</p>
                    <small>📅 ${task.planned_start_date || "?"} → ${task.planned_end_date || "?"}</small>
                    <small> | ⏱️ ${task.planned_hours || 0} giờ</small>
                </div>
                <span class="task-status status-${task.status}">${getTaskStatusName(task.status)}</span>
            </div>
        `).join("");
        
    } catch (error) {
        console.error("Error loading tasks:", error);
    }
}

async function loadMembers(projectCode) {
    try {
        const members = await getProjectMembers(projectCode);
        const container = document.getElementById("membersList");
        
        if (members.length === 0) {
            container.innerHTML = '<p class="empty-message">Chưa có thành viên nào</p>';
            return;
        }
        
        container.innerHTML = members.map(member => `
            <div class="member-item">
                <div>
                    <strong>👤 ${member.user_id}</strong>
                    <span class="member-role">${getRoleName(member.role_in_project)}</span>
                    <div><small>Tham gia: ${new Date(member.joined_at).toLocaleDateString()}</small></div>
                </div>
            </div>
        `).join("");
        
    } catch (error) {
        console.error("Error loading members:", error);
    }
}

async function loadCostEstimates(projectCode) {
    try {
        const summary = await getCostSummary(projectCode);
        const estimates = await getProjectCostEstimates(projectCode);
        
        const summaryContainer = document.getElementById("estimatesSummary");
        summaryContainer.innerHTML = `
            <h3>📊 Tổng hợp chi phí</h3>
            <div class="summary-stats">
                <div class="summary-item">
                    <div class="label">💰 Tiền công</div>
                    <div class="value">${formatCurrency(summary.total_labor_cost)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">🖥️ Thiết bị</div>
                    <div class="value">${formatCurrency(summary.total_equipment_cost)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">📝 Văn phòng phẩm</div>
                    <div class="value">${formatCurrency(summary.total_office_supplies_cost)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">🎓 Đào tạo</div>
                    <div class="value">${formatCurrency(summary.total_training_cost)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">✈️ Đi lại</div>
                    <div class="value">${formatCurrency(summary.total_travel_cost)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">📦 Khác</div>
                    <div class="value">${formatCurrency(summary.total_other_cost)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">🎯 Tổng cộng</div>
                    <div class="value">${formatCurrency(summary.grand_total)}</div>
                </div>
            </div>
        `;
        
        const listContainer = document.getElementById("estimatesList");
        if (estimates.length === 0) {
            listContainer.innerHTML = '<p class="empty-message">Chưa có ước lượng chi phí</p>';
            return;
        }
        
        listContainer.innerHTML = estimates.map(est => `
            <div class="estimate-item">
                <div>
                    <strong>Công việc ID: ${est.task_id}</strong>
                    <div class="estimate-details">
                        <span>💰 Tiền công: ${formatCurrency(est.labor_cost)}</span>
                        <span>🖥️ TB: ${formatCurrency(est.equipment_cost)}</span>
                        <span>📝 VP: ${formatCurrency(est.office_supplies_cost)}</span>
                        <span>🎓 ĐT: ${formatCurrency(est.training_cost)}</span>
                        <span>✈️ ĐL: ${formatCurrency(est.travel_cost)}</span>
                    </div>
                    <small>📝 ${est.notes || "Không có ghi chú"}</small>
                </div>
                <div class="estimate-total">${formatCurrency(est.total_cost)}</div>
            </div>
        `).join("");
        
    } catch (error) {
        console.error("Error loading cost estimates:", error);
    }
}

function setupTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            
            tabBtns.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(`${tabId}Tab`).classList.add("active");
        });
    });
}

function getTaskStatusName(status) {
    const statuses = {
        "not_started": "⭕ Chưa bắt đầu",
        "in_progress": "🔄 Đang làm",
        "completed": "✅ Hoàn thành",
        "delayed": "⚠️ Trễ hạn"
    };
    return statuses[status] || status;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}