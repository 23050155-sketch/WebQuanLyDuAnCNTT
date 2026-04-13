// ==================== BIẾN TOÀN CỤC ====================
let currentProjectCode = null;
let currentUser = null;

let currentEditingMember = null;  // Lưu thông tin thành viên đang chỉnh sửa
let pendingDeleteMember = null;   // Lưu thông tin thành viên sắp xóa

let currentEditingTask = null;
let pendingDeleteTask = null;

let alertCallback = null



// ==================== HÀM THÔNG BÁO ===================
function showCustomAlert(message, subMessage = "", icon = "✅", onClose = null) {
    alertCallback = onClose;
    
    const alertModal = document.getElementById("customAlertModal");
    const alertIcon = document.getElementById("alertIcon");
    const alertMessage = document.getElementById("alertMessage");
    const alertSubMessage = document.getElementById("alertSubMessage");
    
    if (alertIcon) alertIcon.textContent = icon;
    if (alertMessage) alertMessage.textContent = message;
    if (alertSubMessage) {
        if (subMessage) {
            alertSubMessage.textContent = subMessage;
            alertSubMessage.style.display = "block";
        } else {
            alertSubMessage.style.display = "none";
        }
    }
    
    if (alertModal) {
        alertModal.style.display = "flex";
    }
}

function closeCustomAlert() {
    const alertModal = document.getElementById("customAlertModal");
    if (alertModal) {
        alertModal.style.display = "none";
    }
    if (alertCallback) {
        alertCallback();
        alertCallback = null;
    }
}




// ==================== HÀM KHỞI TẠO ====================
async function initProjectDetail() {
    // Lấy mã dự án từ URL hoặc session
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectCode = urlParams.get("code") || sessionStorage.getItem("currentProject");
    currentUser = getUserInfo();
    
    if (!currentProjectCode) {
        alert("Không tìm thấy mã dự án!");
        window.location.href = "/html/index.html";
        return;
    }
    
    if (!currentUser) {
        alert("Vui lòng đăng nhập!");
        window.location.href = "/html/login.html";
        return;
    }
    
    await loadProjectDetail();
    setupEventListeners();
    setupTabs();
}

// ==================== LOAD THÔNG TIN DỰ ÁN ====================
async function loadProjectDetail() {
    try {
        // Kiểm tra quyền truy cập
        const hasAccess = await checkProjectAccess(currentProjectCode);
        if (!hasAccess) {
            alert("Bạn không có quyền truy cập dự án này!");
            window.location.href = "/html/index.html";
            return;
        }
        
        // Load vai trò của user trong project
        await loadUserRoleInProject();
        
        // Load thông tin project
        const project = await getProject(currentProjectCode);
        document.getElementById("projectTitle").textContent = `📊 ${project.project_name}`;
        
        // Hiển thị thông tin dự án (kèm role)
        document.getElementById("projectInfo").innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">📁 Mã dự án:</span>
                    <span class="info-value">${project.project_id}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">🏷️ Tên dự án:</span>
                    <span class="info-value">${project.project_name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">🏢 Phòng ban:</span>
                    <span class="info-value">${project.department}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">📝 Mô tả:</span>
                    <span class="info-value">${project.description || "Không có mô tả"}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">💰 Ngân sách:</span>
                    <span class="info-value">${formatCurrency(project.total_budget)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">📊 Trạng thái:</span>
                    <span class="info-value status-${project.status}">${getStatusName(project.status)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">🎭 Vai trò của bạn:</span>
                    <span class="info-value">${getRoleName(currentUserRoleInProject)}</span>
                </div>
            </div>
        `;
        
        // Ẩn/hiện nút dựa trên quyền
        const addMemberBtn = document.getElementById("addMemberBtn");
        if (addMemberBtn) {
            addMemberBtn.style.display = canManageMembers() ? "inline-flex" : "none";
        }
        
        const addTaskBtn = document.getElementById("addTaskBtn");
        if (addTaskBtn) {
            addTaskBtn.style.display = canCreateTask() ? "inline-flex" : "none";
        }
        
        // Load các tab
        await loadTasks();
        await loadMembers();
        await loadCostEstimates();
        
    } catch (error) {
        console.error("Error loading project:", error);
        document.getElementById("projectInfo").innerHTML = '<p class="error-message">❌ Không thể tải thông tin dự án</p>';
    }
}





// ==================== KIỂM TRA QUYỀN TRONG PROJECT ====================
let currentUserRoleInProject = null;  // Lưu vai trò của user trong project hiện tại

async function loadUserRoleInProject() {
    try {
        const members = await getProjectMembers(currentProjectCode);
        const currentMember = members.find(m => m.user_id === currentUser.user_id);
        currentUserRoleInProject = currentMember ? currentMember.role_in_project : null;
        
        // Nếu là người tạo project (created_by) thì set role là 'creator'
        const project = await getProject(currentProjectCode);
        if (project && project.created_by === currentUser.user_id) {
            currentUserRoleInProject = 'creator';
        }
        
        console.log("User role in project:", currentUserRoleInProject);
        return currentUserRoleInProject;
    } catch (error) {
        console.error("Error loading user role:", error);
        return null;
    }
}

// Kiểm tra quyền xem
function canView() {
    return currentUserRoleInProject !== null;
}

// Kiểm tra quyền chỉnh sửa project (creator hoặc manager)
function canEditProject() {
    return currentUserRoleInProject === 'creator' || currentUserRoleInProject === 'manager';
}

// Kiểm tra quyền xóa project (chỉ creator)
function canDeleteProject() {
    return currentUserRoleInProject === 'creator';
}

// Kiểm tra quyền quản lý thành viên (creator hoặc manager)
function canManageMembers() {
    return currentUserRoleInProject === 'creator' || currentUserRoleInProject === 'manager';
}

// ==================== QUYỀN VỚI CÔNG VIỆC (TASKS) ====================
function canViewTasks() {
    return currentUserRoleInProject !== null;
}

function canCreateTask() {
    return currentUserRoleInProject === 'creator' || 
           currentUserRoleInProject === 'manager' || 
           currentUserRoleInProject === 'developer';
}

function canEditTask() {
    return currentUserRoleInProject === 'creator' || 
           currentUserRoleInProject === 'manager' || 
           currentUserRoleInProject === 'developer';
}

function canDeleteTask() {
    // CHỈ creator và manager mới được xóa task
    return currentUserRoleInProject === 'creator' || 
           currentUserRoleInProject === 'manager';
}

function canChangeTaskStatus() {
    return currentUserRoleInProject === 'creator' || 
           currentUserRoleInProject === 'manager' || 
           currentUserRoleInProject === 'developer' ||
           currentUserRoleInProject === 'tester';
}




// ==================== QUẢN LÝ THÀNH VIÊN ====================
async function loadMembers() {
    try {
        console.log("=== loadMembers called ===");
        console.log("Project code:", currentProjectCode);
        
        const members = await getProjectMembers(currentProjectCode);
        console.log("Members data from API:", members);
        
        const container = document.getElementById("membersList");
        if (!container) {
            console.error("membersList element not found!");
            return;
        }
        
        if (!members || members.length === 0) {
            container.innerHTML = '<div class="empty-state">👥 Chưa có thành viên nào. Hãy thêm thành viên đầu tiên!</div>';
            return;
        }
        
        // Lấy danh sách users từ API
        let allUsers = [];
        try {
            allUsers = await getUsers();
            console.log("All users from API:", allUsers);
            
            // Nếu allUsers là object có dạng { data: [...] } thì xử lý
            if (allUsers && allUsers.data && Array.isArray(allUsers.data)) {
                allUsers = allUsers.data;
            }
            if (!Array.isArray(allUsers)) {
                allUsers = [];
            }
        } catch(e) {
            console.error("Error loading users:", e);
        }
        
        // Tạo map user_id -> user object để tra cứu nhanh
        const userMap = new Map();
        allUsers.forEach(user => {
            userMap.set(user.user_id, user);
        });
        
        console.log("User map created with", userMap.size, "users");
        
        // Hiển thị danh sách thành viên
        let membersHtml = '';
        for (const member of members) {
            const userId = member.user_id;
            const memberId = member.id;
            
            // Lấy thông tin user từ map
            let userInfo = userMap.get(userId);
            
            // Nếu không tìm thấy trong danh sách users, thử gọi API riêng cho user đó
            if (!userInfo && userId) {
                try {
                    // Thử lấy user theo ID
                    const singleUser = await apiRequest(`/users/${userId}`);
                    if (singleUser) {
                        userInfo = singleUser;
                        userMap.set(userId, userInfo);
                    }
                } catch(e) {
                    console.log(`Could not fetch user ${userId}:`, e);
                }
            }
            
            const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.user_id === 1);
            const isCurrentUser = currentUser && userId === currentUser.user_id;
            
            membersHtml += `
                <div class="member-card" data-member-id="${memberId}" data-user-id="${userId}">
                    <div class="member-avatar">👤</div>
                    <div class="member-info">
                        <div class="member-name">${userInfo?.fullname || `User ID: ${userId}`}</div>
                        <div class="member-username">@${userInfo?.username || "unknown"}</div>
                        <div class="member-role-badge">${getRoleName(member.role_in_project)}</div>
                        <div class="member-joined">📅 Tham gia: ${member.joined_at ? new Date(member.joined_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
                    </div>
                    ${canManageMembers() && !isCurrentUser ? `
                        <div class="member-actions">
                            <button onclick="showChangeRoleModal(${memberId}, ${userId}, '${member.role_in_project}', '${(userInfo?.fullname || `User ID: ${userId}`).replace(/'/g, "\\'")}')" class="btn-icon" title="Đổi vai trò">🔄</button>
                            <button onclick="showConfirmDeleteModal(${memberId}, '${(userInfo?.fullname || `User ID: ${userId}`).replace(/'/g, "\\'")}')" class="btn-icon btn-danger" title="Xóa thành viên">🗑️</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        container.innerHTML = membersHtml;
        console.log("Members displayed successfully");
        
    } catch (error) {
        console.error("Error in loadMembers:", error);
        const container = document.getElementById("membersList");
        if (container) {
            container.innerHTML = `<div class="error-state">❌ Lỗi tải danh sách thành viên: ${error.message}</div>`;
        }
    }
}

// Hiển thị modal thêm thành viên
function showAddMemberModal() {
    if (!canManageMembers()) {
        showCustomAlert("Không có quyền!", "Bạn không có quyền thêm thành viên", "❌");
        return;
    }
    const modal = document.getElementById("memberModal");
    if (modal) {
        modal.style.display = "flex";
        loadUsersForSelect();
    }
}

// Đóng modal
function closeMemberModal() {
    const modal = document.getElementById("memberModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// Load danh sách user để chọn
async function loadUsersForSelect() {
    try {
        console.log("Loading users for select...");
        
        // Lấy tất cả users
        const allUsers = await getUsers();
        console.log("All users:", allUsers);
        
        // Lấy members hiện tại của dự án
        let currentMembers = [];
        try {
            currentMembers = await getProjectMembers(currentProjectCode);
        } catch(e) {
            console.log("No members yet or error:", e);
        }
        console.log("Current members:", currentMembers);
        
        const existingUserIds = currentMembers.map(m => m.user_id);
        console.log("Existing user IDs:", existingUserIds);
        
        // Lọc ra những user chưa có trong dự án
        const availableUsers = allUsers.filter(u => !existingUserIds.includes(u.user_id));
        console.log("Available users:", availableUsers);
        
        const userSelect = document.getElementById("memberUserId");
        if (userSelect) {
            if (availableUsers.length === 0) {
                userSelect.innerHTML = '<option value="">-- Không có thành viên nào để thêm --</option>';
            } else {
                userSelect.innerHTML = '<option value="">-- Chọn thành viên --</option>' + 
                    availableUsers.map(user => `
                        <option value="${user.user_id}">${user.username} - ${user.fullname} (${user.role})</option>
                    `).join("");
            }
        } else {
            console.error("Element memberUserId not found!");
        }
    } catch (error) {
        console.error("Error loading users:", error);
        const userSelect = document.getElementById("memberUserId");
        if (userSelect) {
            userSelect.innerHTML = '<option value="">-- Lỗi tải danh sách --</option>';
        }
    }
}

// Thêm thành viên vào dự án
async function addMemberToProject() {
    const userId = document.getElementById("memberUserId").value;
    const role = document.getElementById("memberRole").value;
    
    if (!userId) {
        alert("Vui lòng chọn thành viên!");
        return;
    }
    
    const addButton = document.querySelector("#memberModal .btn-primary");
    if (addButton) addButton.disabled = true;
    
    try {
        console.log("Adding member - Project:", currentProjectCode, "User:", userId, "Role:", role);
        
        // Thêm thành viên
        const result = await addProjectMember(currentProjectCode, parseInt(userId), role);
        console.log("Add member result:", result);
        
        showCustomAlert("Thêm thành viên thành công!", "", "✅");
        closeMemberModal();
        
        // Reset form
        document.getElementById("addMemberForm")?.reset();
        
        // Reload danh sách thành viên ngay lập tức
        await loadMembers();
        
    } catch (error) {
        console.error("Error adding member:", error);
        alert("❌ Lỗi: " + (error.message || "Không thể thêm thành viên"));
    } finally {
        if (addButton) addButton.disabled = false;
    }
}

// Hiển thị modal đổi vai trò
// Hiển thị modal đổi vai trò (thay thế hàm cũ)
function showChangeRoleModal(memberId, userId, currentRole, memberName) {
    currentEditingMember = {
        id: memberId,
        user_id: userId,
        current_role: currentRole,
        name: memberName
    };
    
    // Hiển thị thông tin thành viên trong modal
    const memberInfoDiv = document.getElementById('editMemberInfo');
    if (memberInfoDiv) {
        memberInfoDiv.innerHTML = `
            <div class="member-avatar-large">👤</div>
            <div class="member-info-text">
                <h4>${memberName}</h4>
                <p>Vai trò hiện tại: ${getRoleName(currentRole)}</p>
            </div>
        `;
    }
    
    // Chọn vai trò hiện tại trong select
    const roleSelect = document.getElementById('editRoleSelect');
    if (roleSelect) {
        roleSelect.value = currentRole;
    }
    
    // Hiển thị modal
    const modal = document.getElementById('editRoleModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Đóng modal chỉnh sửa
function closeEditRoleModal() {
    const modal = document.getElementById('editRoleModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentEditingMember = null;
}

// Xác nhận đổi vai trò
async function confirmChangeRole() {
    if (!currentEditingMember) return;
    
    const newRole = document.getElementById('editRoleSelect').value;
    if (newRole === currentEditingMember.current_role) {
        closeEditRoleModal();
        return;
    }
    
    const saveButton = document.querySelector("#editRoleModal .btn-primary");
    if (saveButton) saveButton.disabled = true;
    
    try {
        await updateProjectMember(currentEditingMember.id, { role_in_project: newRole });
        showCustomAlert("Cập nhật vai trò thành công!", "", "✅");
        closeEditRoleModal();
        await loadMembers();
    } catch (error) {
        showCustomAlert("Có lỗi xảy ra!", error.message, "❌");
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

// Xóa thành viên
// Hiển thị modal xác nhận xóa
function showConfirmDeleteModal(memberId, memberName) {
    pendingDeleteMember = {
        id: memberId,
        name: memberName
    };
    
    const messageEl = document.getElementById('deleteConfirmMessage');
    const subMessageEl = document.getElementById('deleteConfirmSubmessage');
    
    if (messageEl) {
        messageEl.textContent = `Bạn có chắc chắn muốn xóa "${memberName}" khỏi dự án?`;
    }
    if (subMessageEl) {
        subMessageEl.textContent = 'Thành viên sẽ bị xóa khỏi dự án. Hành động này không thể hoàn tác!';
    }
    
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Đóng modal xác nhận xóa
function closeConfirmDeleteModal() {
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) {
        modal.style.display = 'none';
    }
    pendingDeleteMember = null;
}

// Thực hiện xóa thành viên
async function executeDeleteMember() {
    if (!pendingDeleteMember) return;
    
    const deleteButton = document.querySelector("#confirmDeleteModal .btn-danger");
    if (deleteButton) deleteButton.disabled = true;
    
    try {
        await deleteProjectMember(pendingDeleteMember.id);
        showCustomAlert("Xóa thành viên thành công!", `Đã xóa "${pendingDeleteMember.name}" khỏi dự án`, "✅");
        closeConfirmDeleteModal();
        await loadMembers();
    } catch (error) {
        showCustomAlert("Có lỗi xảy ra!", error.message, "❌");
    } finally {
        if (deleteButton) deleteButton.disabled = false;
    }
}

// ==================== QUẢN LÝ CÔNG VIỆC ====================
async function loadTasks() {
    try {
        const tasks = await getProjectTasks(currentProjectCode);
        const container = document.getElementById("tasksList");
        
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 Chưa có công việc nào. Hãy thêm công việc đầu tiên!</div>';
            return;
        }
        
        // Lấy danh sách thành viên để hiển thị tên người thực hiện
        const members = await getProjectMembers(currentProjectCode);
        const userMap = new Map();
        members.forEach(member => {
            userMap.set(member.user_id, member);
        });
        
        container.innerHTML = tasks.map(task => {
            // ========== SỬA Ở ĐÂY ==========
            // Tách riêng quyền Sửa và Xóa
            const showEditButton = canEditTask();    // Developer có thể sửa
            const showDeleteButton = canDeleteTask(); // Developer KHÔNG thể xóa
            const showStatusSelect = canChangeTaskStatus();
            
            // Lấy tên người thực hiện (hỗ trợ nhiều người)
            const assigneeIds = task.assignee_ids || (task.assignee_id ? [task.assignee_id] : []);
            const assigneeNames = assigneeIds.map(id => {
                const member = userMap.get(id);
                return member?.fullname || `User ${id}`;
            }).join(', ');
            
            return `
                <div class="task-card" data-task-id="${task.task_id}">
                    <div class="task-header">
                        <h3>${escapeHtml(task.task_name)}</h3>
                        <div class="task-actions">
                            <span class="task-priority priority-${task.priority}">${getPriorityName(task.priority)}</span>
                            ${showEditButton ? `<button onclick="showEditTaskModal(${task.task_id})" class="btn-icon-sm" title="Sửa">✏️</button>` : ''}
                            ${showDeleteButton ? `<button onclick="showConfirmDeleteTaskModal(${task.task_id}, '${escapeHtml(task.task_name)}')" class="btn-icon-sm btn-danger" title="Xóa">🗑️</button>` : ''}
                        </div>
                    </div>
                    <div class="task-body">
                        <p class="task-desc">${task.description || "Không có mô tả"}</p>
                        <div class="task-meta">
                            <span>👥 Người thực hiện: ${assigneeNames || "Chưa phân công"}</span>
                            <span>📅 ${task.planned_start_date || "?"} → ${task.planned_end_date || "?"}</span>
                        </div>
                    </div>
                    <div class="task-footer">
                        ${showStatusSelect ? `
                            <select onchange="updateTaskStatusDirect(${task.task_id}, this.value)" class="status-select">
                                <option value="not_started" ${task.status === 'not_started' ? 'selected' : ''}>⭕ Chưa bắt đầu</option>
                                <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>🔄 Đang làm</option>
                                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>✅ Hoàn thành</option>
                                <option value="delayed" ${task.status === 'delayed' ? 'selected' : ''}>⚠️ Trễ hạn</option>
                            </select>
                        ` : `
                            <span class="task-status status-${task.status}">${getTaskStatusName(task.status)}</span>
                        `}
                    </div>
                </div>
            `;
        }).join("");
        
    } catch (error) {
        console.error("Error loading tasks:", error);
        document.getElementById("tasksList").innerHTML = '<div class="error-state">❌ Lỗi tải danh sách công việc</div>';
    }
}

// Hiển thị modal thêm công việc
function showAddTaskModal() {
    if (!canCreateTask()) {
        showCustomAlert("Không có quyền!", "Bạn không có quyền thêm công việc", "❌");
        return;
    }
    const modal = document.getElementById("taskModal");
    if (modal) {
        modal.style.display = "flex";
        loadAssigneesForTask();
    }
}

function closeTaskModal() {
    const modal = document.getElementById("taskModal");
    if (modal) {
        modal.style.display = "none";
        document.getElementById("addTaskForm")?.reset();
    }
}

// Load danh sách người thực hiện
async function loadAssigneesForTask() {
    try {
        const members = await getProjectMembers(currentProjectCode);
        const assigneeSelect = document.getElementById("taskAssignees");
        if (assigneeSelect) {
            assigneeSelect.innerHTML = members.map(member => `
                <option value="${member.user_id}">${member.fullname || `User ${member.user_id}`} (${getRoleName(member.role_in_project)})</option>
            `).join("");
        }
    } catch (error) {
        console.error("Error loading assignees:", error);
    }
}

async function loadAssigneesForEditTask() {
    try {
        const members = await getProjectMembers(currentProjectCode);
        const assigneeSelect = document.getElementById("editTaskAssignees");
        if (assigneeSelect) {
            assigneeSelect.innerHTML = members.map(member => `
                <option value="${member.user_id}">${member.fullname || `User ${member.user_id}`} (${getRoleName(member.role_in_project)})</option>
            `).join("");
        }
    } catch (error) {
        console.error("Error loading assignees:", error);
    }
}

// Thêm công việc mới
async function addTaskToProject() {
    const assigneeSelect = document.getElementById("taskAssignees");
    const selectedAssignees = Array.from(assigneeSelect.selectedOptions).map(opt => parseInt(opt.value));
    
    const taskData = {
        project_id: currentProjectCode,
        task_name: document.getElementById("taskName").value,
        description: document.getElementById("taskDesc").value,
        assignee_ids: selectedAssignees,
        planned_start_date: document.getElementById("taskStartDate").value || null,
        planned_end_date: document.getElementById("taskEndDate").value || null,
        priority: document.getElementById("taskPriority").value,
        status: "not_started",
        created_by: currentUser.user_id
    };
    
    if (!taskData.task_name) {
        showCustomAlert("Thiếu thông tin", "Vui lòng nhập tên công việc", "❌");
        return;
    }
    
    const addButton = document.querySelector("#taskModal .btn-primary");
    if (addButton) addButton.disabled = true;
    
    try {
        await createTask(taskData);
        showCustomAlert("Thêm công việc thành công!", "", "✅");
        closeTaskModal();
        await loadTasks();
    } catch (error) {
        showCustomAlert("Có lỗi xảy ra!", error.message, "❌");
    } finally {
        if (addButton) addButton.disabled = false;
    }
}




// Hiển thị modal sửa công việc
async function showEditTaskModal(taskId) {
    try {
        const task = await getTask(taskId);
        currentEditingTask = task;
        
        document.getElementById("editTaskName").value = task.task_name || "";
        document.getElementById("editTaskDesc").value = task.description || "";
        document.getElementById("editTaskStartDate").value = task.planned_start_date || "";
        document.getElementById("editTaskEndDate").value = task.planned_end_date || "";
        document.getElementById("editTaskPriority").value = task.priority || "medium";
        document.getElementById("editTaskStatus").value = task.status || "not_started";
        
        await loadAssigneesForEditTask();
        
        // Chọn các assignee hiện tại
        const assigneeIds = task.assignee_ids || (task.assignee_id ? [task.assignee_id] : []);
        const assigneeSelect = document.getElementById("editTaskAssignees");
        Array.from(assigneeSelect.options).forEach(opt => {
            if (assigneeIds.includes(parseInt(opt.value))) {
                opt.selected = true;
            }
        });
        
        const modal = document.getElementById("editTaskModal");
        if (modal) {
            modal.style.display = "flex";
        }
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    }
}

function closeEditTaskModal() {
    const modal = document.getElementById("editTaskModal");
    if (modal) {
        modal.style.display = "none";
    }
    currentEditingTask = null;
}

async function confirmUpdateTask() {
    if (!currentEditingTask) return;
    
    const assigneeSelect = document.getElementById("editTaskAssignees");
    const selectedAssignees = Array.from(assigneeSelect.selectedOptions).map(opt => parseInt(opt.value));
    
    const taskData = {
        task_name: document.getElementById("editTaskName").value,
        description: document.getElementById("editTaskDesc").value,
        assignee_ids: selectedAssignees,
        planned_start_date: document.getElementById("editTaskStartDate").value || null,
        planned_end_date: document.getElementById("editTaskEndDate").value || null,
        priority: document.getElementById("editTaskPriority").value,
        status: document.getElementById("editTaskStatus").value
    };
    
    if (!taskData.task_name) {
        showCustomAlert("Thiếu thông tin", "Vui lòng nhập tên công việc", "❌");
        return;
    }
    
    const saveButton = document.querySelector("#editTaskModal .btn-primary");
    if (saveButton) saveButton.disabled = true;
    
    try {
        await updateTask(currentEditingTask.task_id, taskData);
        showCustomAlert("Cập nhật công việc thành công!", "", "✅");
        closeEditTaskModal();
        await loadTasks();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

// Cập nhật trạng thái trực tiếp từ dropdown
async function updateTaskStatusDirect(taskId, newStatus) {
    try {
        await updateTask(taskId, { status: newStatus });
        await loadTasks();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    }
}

// Xóa công việc
function showConfirmDeleteTaskModal(taskId, taskName) {
    pendingDeleteTask = { id: taskId, name: taskName };
    const messageEl = document.getElementById("deleteTaskConfirmMessage");
    if (messageEl) {
        messageEl.textContent = `Bạn có chắc chắn muốn xóa công việc "${taskName}"?`;
    }
    const modal = document.getElementById("confirmDeleteTaskModal");
    if (modal) {
        modal.style.display = "flex";
    }
}

function closeConfirmDeleteTaskModal() {
    const modal = document.getElementById("confirmDeleteTaskModal");
    if (modal) {
        modal.style.display = "none";
    }
    pendingDeleteTask = null;
}

async function executeDeleteTask() {
    if (!pendingDeleteTask) return;
    
    const deleteButton = document.querySelector("#confirmDeleteTaskModal .btn-danger");
    if (deleteButton) deleteButton.disabled = true;
    
    try {
        await deleteTask(pendingDeleteTask.id);
        showCustomAlert("Xóa công việc thành công!", `Đã xóa "${pendingDeleteTask.name}"`, "✅");
        closeConfirmDeleteTaskModal();
        await loadTasks();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (deleteButton) deleteButton.disabled = false;
    }
}





// Cập nhật trạng thái công việc
async function updateTaskStatus(taskId) {
    const newStatus = prompt("Chọn trạng thái mới:\n- not_started (Chưa bắt đầu)\n- in_progress (Đang làm)\n- completed (Hoàn thành)\n- delayed (Trễ hạn)", "in_progress");
    
    if (newStatus && ["not_started", "in_progress", "completed", "delayed"].includes(newStatus)) {
        try {
            await updateTask(taskId, { status: newStatus });
            showCustomAlert("Cập nhật trạng thái thành công!", "", "✅");
            await loadTasks();
        } catch (error) {
            showCustomAlert("Có lỗi xảy ra!", error.message, "❌");
        }
    } else if (newStatus) {
        alert("Trạng thái không hợp lệ!");
    }
}

// ==================== QUẢN LÝ CHI PHÍ ====================
async function loadCostEstimates() {
    try {
        const summary = await getCostSummary(currentProjectCode);
        const estimates = await getProjectCostEstimates(currentProjectCode);
        
        // Hiển thị summary
        const summaryContainer = document.getElementById("estimatesSummary");
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <h3>📊 Tổng hợp chi phí dự án</h3>
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
                    <div class="summary-item total">
                        <div class="label">🎯 TỔNG CỘNG</div>
                        <div class="value">${formatCurrency(summary.grand_total)}</div>
                    </div>
                </div>
            `;
        }
        
        // Hiển thị danh sách
        const listContainer = document.getElementById("estimatesList");
        if (!estimates || estimates.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">💰 Chưa có ước lượng chi phí nào</div>';
            return;
        }
        
        listContainer.innerHTML = estimates.map(est => `
            <div class="estimate-card">
                <div class="estimate-header">
                    <strong>Công việc #${est.task_id}</strong>
                    <span class="estimate-status status-${est.status}">${est.status}</span>
                </div>
                <div class="estimate-details">
                    <span>💰 Tiền công: ${formatCurrency(est.labor_cost)}</span>
                    <span>🖥️ TB: ${formatCurrency(est.equipment_cost)}</span>
                    <span>📝 VP: ${formatCurrency(est.office_supplies_cost)}</span>
                    <span>🎓 ĐT: ${formatCurrency(est.training_cost)}</span>
                    <span>✈️ ĐL: ${formatCurrency(est.travel_cost)}</span>
                </div>
                <div class="estimate-total">
                    Tổng: <strong>${formatCurrency(est.total_cost)}</strong>
                </div>
                ${est.notes ? `<div class="estimate-notes">📝 ${est.notes}</div>` : ''}
            </div>
        `).join("");
        
    } catch (error) {
        console.error("Error loading cost estimates:", error);
    }
}

// ==================== CẬP NHẬT DỰ ÁN ====================
async function updateProjectStatus() {
    const newStatus = document.getElementById("projectStatus")?.value;
    if (!newStatus) return;
    
    try {
        await updateProject(currentProjectCode, { status: newStatus });
        showCustomAlert("Cập nhật trạng thái dự án thành công!", "", "✅");
        await loadProjectDetail();
    } catch (error) {
        showCustomAlert("Có lỗi xảy ra!", error.message, "❌");
    }
}

async function updateProjectBudget() {
    const newBudget = parseFloat(document.getElementById("projectBudget")?.value);
    if (isNaN(newBudget)) {
        alert("Vui lòng nhập số tiền hợp lệ!");
        return;
    }
    
    try {
        await updateProject(currentProjectCode, { total_budget: newBudget });
        showCustomAlert("Cập nhật ngân sách thành công!", "", "✅");
        await loadProjectDetail();
    } catch (error) {
        showCustomAlert("Có lỗi xảy ra!", error.message, "❌");
    }
}

async function deleteProject() {
    if (confirm("⚠️ Bạn có chắc chắn muốn xóa dự án này? Hành động này không thể hoàn tác!")) {
        try {
            await deleteProjectAPI(currentProjectCode);
            showCustomAlert("Xóa dự án thành công!", "Dự án đã được xóa vĩnh viễn", "✅");
            window.location.href = "/html/index.html";
        } catch (error) {
            showCustomAlert("Có lỗi xảy ra!", error.message, "❌");
        }
    }
}

// ==================== UI HELPER ====================
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

function setupEventListeners() {
    // Add member button
    const addMemberBtn = document.getElementById("addMemberBtn");
    if (addMemberBtn) addMemberBtn.onclick = showAddMemberModal;
    
    // Add task button
    const addTaskBtn = document.getElementById("addTaskBtn");
    if (addTaskBtn) addTaskBtn.onclick = showAddTaskModal;
    
    // Member form
    const addMemberForm = document.getElementById("addMemberForm");
    if (addMemberForm) addMemberForm.onsubmit = (e) => { e.preventDefault(); addMemberToProject(); };
    
    // Task form
    const addTaskForm = document.getElementById("addTaskForm");
    if (addTaskForm) addTaskForm.onsubmit = (e) => { e.preventDefault(); addTaskToProject(); };
    
    // Click outside modal to close
    window.onclick = (e) => {
        const memberModal = document.getElementById("memberModal");
        const taskModal = document.getElementById("taskModal");
        const editRoleModal = document.getElementById("editRoleModal");
        const confirmDeleteModal = document.getElementById("confirmDeleteModal");
        const editTaskModal = document.getElementById("editTaskModal");
        const confirmDeleteTaskModal = document.getElementById("confirmDeleteTaskModal");
        
        if (e.target === memberModal) closeMemberModal();
        if (e.target === taskModal) closeTaskModal();
        if (e.target === editRoleModal) closeEditRoleModal();
        if (e.target === confirmDeleteModal) closeConfirmDeleteModal();
        if (e.target === editTaskModal) closeEditTaskModal();
        if (e.target === confirmDeleteTaskModal) closeConfirmDeleteTaskModal();
    };
}

// ==================== HÀM TIỆN ÍCH ====================
function getStatusName(status) {
    const statuses = {
        "planning": "📋 Lên kế hoạch",
        "in_progress": "⚙️ Đang thực hiện",
        "completed": "✅ Hoàn thành",
        "cancelled": "❌ Đã hủy"
    };
    return statuses[status] || status;
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

function getPriorityName(priority) {
    const priorities = {
        "low": "🟢 Thấp",
        "medium": "🟡 Trung bình",
        "high": "🟠 Cao",
        "urgent": "🔴 Khẩn cấp"
    };
    return priorities[priority] || priority;
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


function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


// ==================== KHỞI TẠO ====================
document.addEventListener("DOMContentLoaded", initProjectDetail);