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
        await loadTimeEstimates();
        
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
        //const project = await getProject(currentProjectCode);
        //if (project && project.created_by === currentUser.user_id) {
        //    currentUserRoleInProject = 'creator';
        //}
        
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




// ==================== ƯỚC LƯỢNG THỜI GIAN ====================
let currentEditingTimeEstimate = null;

// Hàm lấy tên chuyên gia (thêm vào đầu phần này)
async function getExpertName(expertId) {
    try {
        const users = await getUsers();
        const user = users.find(u => u.user_id === expertId);
        return user?.fullname || `Chuyên gia #${expertId}`;
    } catch (error) {
        return `Chuyên gia #${expertId}`;
    }
}

// Load danh sách ước lượng thời gian
async function loadTimeEstimates() {
    try {
        // Lấy danh sách tasks trước để biết task_name
        const tasks = await getProjectTasks(currentProjectCode);
        const taskMap = new Map();
        tasks.forEach(task => {
            taskMap.set(task.task_id, task);
        });
        
        // Lấy danh sách ước lượng thời gian
        const estimates = await getProjectTimeEstimates(currentProjectCode);
        const container = document.getElementById("timeEstimatesList");
        
        if (!container) return;
        
        if (!estimates || estimates.length === 0) {
            container.innerHTML = '<div class="empty-state">⏰ Chưa có ước lượng thời gian nào</div>';
            return;
        }
        
        // Lấy thông tin users để hiển thị tên
        const allUsers = await getUsers();
        const userMap = new Map();
        allUsers.forEach(user => {
            userMap.set(user.user_id, user);
        });
        
        container.innerHTML = await Promise.all(estimates.map(async (est) => {
            const task = taskMap.get(est.task_id);
            const isManager = currentUserRoleInProject === 'manager';
            const isOwner = currentUser && est.expert_id === currentUser.user_id;
            
            // Quyền hiển thị nút
            const canEdit = isOwner && (est.status === 'draft' || est.status === 'submitted');
            const canDelete = isManager || isOwner;
            const canApprove = isManager && est.status === 'submitted';
            const canReject = isManager && (est.status === 'draft' || est.status === 'submitted');
            
            const expertName = userMap.get(est.expert_id)?.fullname || `Chuyên gia #${est.expert_id}`;
            const approverName = est.approved_by ? (userMap.get(est.approved_by)?.fullname || `Người dùng #${est.approved_by}`) : null;
            
            return `
                <div class="estimate-card" data-estimate-id="${est.estimate_id}">
                    <div class="estimate-header">
                        <strong>📋 ${task?.task_name || `Công việc #${est.task_id}`}</strong>
                        <span class="estimate-status status-${est.status}">${getEstimateStatusName(est.status)}</span>
                    </div>
                    <div class="estimate-details">
                        <span>📈 Lạc quan: <strong>${est.optimistic_days}</strong> ngày</span>
                        <span>📉 Bi quan: <strong>${est.pessimistic_days}</strong> ngày</span>
                        <span>📊 Khả năng nhất: <strong>${est.most_likely_days}</strong> ngày</span>
                        <span>🎯 Kỳ vọng: <strong>${est.expected_days}</strong> ngày</span>
                        <span>📊 Độ tin cậy: <strong>${est.confidence_level}%</strong></span>
                    </div>
                    ${est.reasoning ? `<div class="estimate-notes">💬 ${escapeHtml(est.reasoning)}</div>` : ''}
                    <div class="estimate-footer">
                        <div class="estimate-info">
                            <span class="estimate-author">👤 Chuyên gia: ${expertName}</span>
                            <span class="estimate-date">📅 ${new Date(est.created_at).toLocaleDateString()}</span>
                            ${approverName ? `<span class="estimate-approved">✅ Duyệt bởi: ${approverName}</span>` : ''}
                        </div>
                        <div class="estimate-actions">
                            ${canApprove ? `<button onclick="approveTimeEstimate(${est.estimate_id})" class="btn-icon btn-success" title="Duyệt">✅ Duyệt</button>` : ''}
                            ${canReject ? `<button onclick="rejectTimeEstimate(${est.estimate_id})" class="btn-icon btn-warning" title="Từ chối">❌ Từ chối</button>` : ''}
                            ${canEdit ? `<button onclick="editTimeEstimate(${est.estimate_id})" class="btn-icon" title="Sửa">✏️ Sửa</button>` : ''}
                            ${canDelete ? `<button onclick="showConfirmDeleteTimeEstimateModal(${est.estimate_id}, '${escapeHtml(task?.task_name || `Công việc #${est.task_id}`)}', '${expertName}')" class="btn-icon btn-danger" title="Xóa">🗑️ Xóa</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        })).then(results => results.join(""));
        
    } catch (error) {
        console.error("Error loading time estimates:", error);
        const container = document.getElementById("timeEstimatesList");
        if (container) {
            container.innerHTML = '<div class="error-state">❌ Lỗi tải ước lượng thời gian</div>';
        }
    }
}

// Hiển thị modal thêm ước lượng thời gian
async function showAddTimeEstimateModal() {
    // Kiểm tra quyền: chỉ expert mới được thêm ước lượng
    if (currentUserRoleInProject !== 'expert') {
        showCustomAlert("Không có quyền!", "Chỉ chuyên gia mới có thể thêm ước lượng thời gian", "❌");
        return;
    }
    
    // Load danh sách công việc để chọn
    try {
        const tasks = await getProjectTasks(currentProjectCode);
        const taskSelect = document.getElementById("estimateTaskId");
        if (taskSelect) {
            taskSelect.innerHTML = '<option value="">-- Chọn công việc --</option>' + 
                tasks.map(task => `
                    <option value="${task.task_id}">${escapeHtml(task.task_name)}</option>
                `).join("");
        }
        
        // Reset form
        document.getElementById("addTimeEstimateForm")?.reset();
        document.getElementById("optimisticDays").value = 0;
        document.getElementById("pessimisticDays").value = 0;
        document.getElementById("mostLikelyDays").value = 0;
        document.getElementById("confidenceLevel").value = 50;
        document.getElementById("confidenceValue").textContent = "50%";
        document.getElementById("expectedDays").value = 0;
        
        const modal = document.getElementById("timeEstimateModal");
        if (modal) {
            modal.style.display = "flex";
        }
        
        // Thêm event listener cho các input để tính expected days
        setupPertCalculator();
        
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    }
}

function closeTimeEstimateModal() {
    const modal = document.getElementById("timeEstimateModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// Tính toán expected days theo công thức PERT
function calculateExpectedDays() {
    const o = parseFloat(document.getElementById("optimisticDays").value) || 0;
    const m = parseFloat(document.getElementById("mostLikelyDays").value) || 0;
    const p = parseFloat(document.getElementById("pessimisticDays").value) || 0;
    
    const expected = (o + 4 * m + p) / 6;
    document.getElementById("expectedDays").value = expected.toFixed(2);
}

function setupPertCalculator() {
    const inputs = ["optimisticDays", "mostLikelyDays", "pessimisticDays"];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.removeEventListener("input", calculateExpectedDays);
            element.addEventListener("input", calculateExpectedDays);
        }
    });
    
    // Confidence level slider
    const confidenceSlider = document.getElementById("confidenceLevel");
    const confidenceValue = document.getElementById("confidenceValue");
    if (confidenceSlider && confidenceValue) {
        confidenceSlider.removeEventListener("input", function() {});
        confidenceSlider.addEventListener("input", function() {
            confidenceValue.textContent = this.value + "%";
        });
    }
}

// Thêm ước lượng thời gian
async function addTimeEstimate() {
    const taskId = document.getElementById("estimateTaskId").value;
    if (!taskId) {
        showCustomAlert("Thiếu thông tin", "Vui lòng chọn công việc", "❌");
        return;
    }
    
    const estimateData = {
        project_id: currentProjectCode,
        task_id: parseInt(taskId),
        expert_id: currentUser.user_id,
        optimistic_days: parseFloat(document.getElementById("optimisticDays").value) || 0,
        pessimistic_days: parseFloat(document.getElementById("pessimisticDays").value) || 0,
        most_likely_days: parseFloat(document.getElementById("mostLikelyDays").value) || 0,
        expected_days: parseFloat(document.getElementById("expectedDays").value) || 0,
        confidence_level: parseInt(document.getElementById("confidenceLevel").value) || 50,
        reasoning: document.getElementById("estimateReasoning").value,
        status: "submitted"
    };
    
    const addButton = document.querySelector("#timeEstimateModal .btn-primary");
    if (addButton) addButton.disabled = true;
    
    try {
        await createExpertTimeEstimate(estimateData);
        showCustomAlert("Thêm ước lượng thành công!", "Đã gửi ước lượng thời gian", "✅");
        closeTimeEstimateModal();
        await loadTimeEstimates();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (addButton) addButton.disabled = false;
    }
}

// Duyệt ước lượng thời gian (chỉ manager)
async function approveTimeEstimate(estimateId) {
    if (currentUserRoleInProject !== 'manager') {
        showCustomAlert("Không có quyền!", "Chỉ quản lý mới có thể duyệt ước lượng", "❌");
        return;
    }
    
    try {
        await approveExpertTimeEstimate(estimateId, currentUser.user_id);
        showCustomAlert("Duyệt thành công!", "Đã duyệt ước lượng thời gian", "✅");
        await loadTimeEstimates();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    }
}

// TỪ CHỐI ước lượng thời gian (chỉ manager) - THÊM MỚI
async function rejectTimeEstimate(estimateId) {
    if (currentUserRoleInProject !== 'manager') {
        showCustomAlert("Không có quyền!", "Chỉ quản lý mới có thể từ chối ước lượng", "❌");
        return;
    }
    
    if (!confirm("Bạn có chắc chắn muốn từ chối ước lượng này?")) return;
    
    try {
        await rejectExpertTimeEstimate(estimateId, currentUser.user_id);
        showCustomAlert("Từ chối thành công!", "Đã từ chối ước lượng thời gian", "✅");
        await loadTimeEstimates();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    }
}

// SỬA ước lượng thời gian (chỉ expert của chính mình, khi chưa duyệt) - THÊM MỚI
async function editTimeEstimate(estimateId) {
    if (currentUserRoleInProject !== 'expert') {
        showCustomAlert("Không có quyền!", "Chỉ chuyên gia mới có thể sửa ước lượng của mình", "❌");
        return;
    }
    
    try {
        // Lấy thông tin ước lượng hiện tại
        const estimates = await getProjectTimeEstimates(currentProjectCode);
        const estimate = estimates.find(e => e.estimate_id === estimateId);
        
        if (!estimate) {
            showCustomAlert("Lỗi!", "Không tìm thấy ước lượng", "❌");
            return;
        }
        
        // Kiểm tra xem có phải của mình không
        if (estimate.expert_id !== currentUser.user_id) {
            showCustomAlert("Không có quyền!", "Bạn chỉ có thể sửa ước lượng của chính mình", "❌");
            return;
        }
        
        // Kiểm tra trạng thái
        if (estimate.status === 'approved') {
            showCustomAlert("Không thể sửa!", "Ước lượng đã được duyệt, không thể sửa", "❌");
            return;
        }
        
        if (estimate.status === 'rejected') {
            showCustomAlert("Không thể sửa!", "Ước lượng đã bị từ chối, hãy tạo ước lượng mới", "❌");
            return;
        }
        
        // Lấy tên công việc
        const tasks = await getProjectTasks(currentProjectCode);
        const task = tasks.find(t => t.task_id === estimate.task_id);
        
        // Lưu thông tin đang sửa
        currentEditingTimeEstimate = estimate;
        
        // Điền dữ liệu vào form
        document.getElementById("editTaskNameDisplay").value = task?.task_name || `Công việc #${estimate.task_id}`;
        document.getElementById("editOptimisticDays").value = estimate.optimistic_days;
        document.getElementById("editPessimisticDays").value = estimate.pessimistic_days;
        document.getElementById("editMostLikelyDays").value = estimate.most_likely_days;
        document.getElementById("editExpectedDays").value = estimate.expected_days;
        document.getElementById("editConfidenceLevel").value = estimate.confidence_level || 50;
        document.getElementById("editConfidenceValue").textContent = `${estimate.confidence_level || 50}%`;
        document.getElementById("editEstimateReasoning").value = estimate.reasoning || "";
        
        // Thiết lập event listeners cho PERT calculator
        setupEditPertCalculator();
        
        // Hiển thị modal
        const modal = document.getElementById("editTimeEstimateModal");
        if (modal) {
            modal.style.display = "flex";
        }
        
    } catch (error) {
        console.error("Error in editTimeEstimate:", error);
        showCustomAlert("Lỗi!", error.message, "❌");
    }
}

// Đóng modal sửa ước lượng
function closeEditTimeEstimateModal() {
    const modal = document.getElementById("editTimeEstimateModal");
    if (modal) {
        modal.style.display = "none";
    }
    currentEditingTimeEstimate = null;
}

// Tính toán expected days cho modal sửa
function calculateEditExpectedDays() {
    const o = parseFloat(document.getElementById("editOptimisticDays").value) || 0;
    const m = parseFloat(document.getElementById("editMostLikelyDays").value) || 0;
    const p = parseFloat(document.getElementById("editPessimisticDays").value) || 0;
    
    const expected = (o + 4 * m + p) / 6;
    document.getElementById("editExpectedDays").value = expected.toFixed(2);
}

// Thiết lập PERT calculator cho modal sửa
function setupEditPertCalculator() {
    const inputs = ["editOptimisticDays", "editMostLikelyDays", "editPessimisticDays"];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.removeEventListener("input", calculateEditExpectedDays);
            element.addEventListener("input", calculateEditExpectedDays);
        }
    });
    
    // Confidence level slider
    const confidenceSlider = document.getElementById("editConfidenceLevel");
    const confidenceValue = document.getElementById("editConfidenceValue");
    if (confidenceSlider && confidenceValue) {
        confidenceSlider.removeEventListener("input", function() {});
        confidenceSlider.addEventListener("input", function() {
            confidenceValue.textContent = this.value + "%";
        });
    }
}

// Xác nhận cập nhật ước lượng thời gian
async function confirmUpdateTimeEstimate() {
    if (!currentEditingTimeEstimate) {
        showCustomAlert("Lỗi!", "Không có ước lượng nào đang được sửa", "❌");
        return;
    }
    
    const updateData = {
        optimistic_days: parseFloat(document.getElementById("editOptimisticDays").value) || 0,
        pessimistic_days: parseFloat(document.getElementById("editPessimisticDays").value) || 0,
        most_likely_days: parseFloat(document.getElementById("editMostLikelyDays").value) || 0,
        expected_days: parseFloat(document.getElementById("editExpectedDays").value) || 0,
        confidence_level: parseInt(document.getElementById("editConfidenceLevel").value) || 50,
        reasoning: document.getElementById("editEstimateReasoning").value,
        status: "submitted"
    };
    
    const saveButton = document.querySelector("#editTimeEstimateModal .btn-primary");
    if (saveButton) saveButton.disabled = true;
    
    try {
        await updateExpertTimeEstimate(currentEditingTimeEstimate.estimate_id, updateData);
        showCustomAlert("Cập nhật thành công!", "Đã cập nhật ước lượng thời gian", "✅");
        closeEditTimeEstimateModal();
        await loadTimeEstimates();
    } catch (error) {
        console.error("Error updating time estimate:", error);
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

// Xóa ước lượng thời gian
// Biến lưu thông tin ước lượng đang chờ xóa
let pendingDeleteTimeEstimate = null;

// Hiển thị modal xác nhận xóa ước lượng thời gian
function showConfirmDeleteTimeEstimateModal(estimateId, taskName, expertName) {
    pendingDeleteTimeEstimate = {
        id: estimateId,
        task_name: taskName,
        expert_name: expertName
    };
    
    const messageEl = document.getElementById("deleteTimeEstimateConfirmMessage");
    const subMessageEl = document.getElementById("deleteTimeEstimateConfirmSubmessage");
    
    if (messageEl) {
        messageEl.innerHTML = `🗑️ Xóa ước lượng thời gian?`;
    }
    if (subMessageEl) {
        subMessageEl.innerHTML = `Bạn có chắc chắn muốn xóa ước lượng cho công việc <strong>"${escapeHtml(taskName)}"</strong>?<br>Hành động này không thể hoàn tác!`;
    }
    
    const modal = document.getElementById("confirmDeleteTimeEstimateModal");
    if (modal) {
        modal.style.display = "flex";
    }
}

// Đóng modal xác nhận xóa
function closeConfirmDeleteTimeEstimateModal() {
    const modal = document.getElementById("confirmDeleteTimeEstimateModal");
    if (modal) {
        modal.style.display = "none";
    }
    pendingDeleteTimeEstimate = null;
}

// Thực hiện xóa ước lượng thời gian
async function executeDeleteTimeEstimate() {
    if (!pendingDeleteTimeEstimate) return;
    
    const deleteButton = document.getElementById("confirmDeleteTimeEstimateBtn");
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.textContent = "⏳ Đang xóa...";
    }
    
    try {
        await deleteExpertTimeEstimate(pendingDeleteTimeEstimate.id);
        
        // Hiển thị thông báo thành công với modal đẹp
        showCustomAlert(
            "Xóa thành công!", 
            `Đã xóa ước lượng thời gian cho công việc "${pendingDeleteTimeEstimate.task_name}"`,
            "✅"
        );
        
        closeConfirmDeleteTimeEstimateModal();
        await loadTimeEstimates(); // Reload danh sách
    } catch (error) {
        console.error("Error deleting time estimate:", error);
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.textContent = "🗑️ Xóa";
        }
    }
}

function getEstimateStatusName(status) {
    const statuses = {
        "draft": "📝 Nháp",
        "submitted": "📤 Đã gửi",
        "approved": "✅ Đã duyệt",
        "rejected": "❌ Đã từ chối"
    };
    return statuses[status] || status;
}





// ==================== QUẢN LÝ CHI PHÍ ====================
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
        
        // Lấy danh sách tasks để hiển thị tên công việc
        const tasks = await getProjectTasks(currentProjectCode);
        const taskMap = new Map();
        tasks.forEach(task => {
            taskMap.set(task.task_id, task);
        });
        
        const isManager = currentUserRoleInProject === 'manager';
        
        listContainer.innerHTML = estimates.map(est => {
            const task = taskMap.get(est.task_id);
            const taskName = task?.task_name || `Công việc #${est.task_id}`;
            
            return `
                <div class="estimate-card" data-estimate-id="${est.estimate_id}">
                    <div class="estimate-header">
                        <strong>📋 ${escapeHtml(taskName)}</strong>
                        <span class="estimate-status status-${est.status}">${getCostEstimateStatusName(est.status)}</span>
                    </div>
                    <div class="estimate-details">
                        <span>💰 Tiền công: ${formatCurrency(est.labor_cost)}</span>
                        <span>🖥️ Thiết bị: ${formatCurrency(est.equipment_cost)}</span>
                        <span>📝 Văn phòng phẩm: ${formatCurrency(est.office_supplies_cost)}</span>
                        <span>🎓 Đào tạo: ${formatCurrency(est.training_cost)}</span>
                        <span>✈️ Đi lại: ${formatCurrency(est.travel_cost)}</span>
                        <span>📦 Khác: ${formatCurrency(est.other_cost)}</span>
                    </div>
                    <div class="estimate-total">
                        Tổng: <strong>${formatCurrency(est.total_cost)}</strong>
                    </div>
                    ${est.notes ? `<div class="estimate-notes">📝 ${escapeHtml(est.notes)}</div>` : ''}
                    <div class="estimate-footer">
                        <div class="estimate-info">
                            <span class="estimate-author">👤 Chuyên gia: ${est.expert_id}</span>
                            <span class="estimate-date">📅 ${new Date(est.created_at).toLocaleDateString()}</span>
                        </div>
                        ${isManager ? `
                            <div class="estimate-actions">
                                <button onclick="showEditCostEstimateModal(${est.estimate_id})" class="btn-icon" title="Sửa">✏️ Sửa</button>
                                <button onclick="showConfirmDeleteCostEstimateModal(${est.estimate_id}, '${escapeHtml(taskName)}')" class="btn-icon btn-danger" title="Xóa">🗑️ Xóa</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join("");
        
    } catch (error) {
        console.error("Error loading cost estimates:", error);
        const listContainer = document.getElementById("estimatesList");
        if (listContainer) {
            listContainer.innerHTML = '<div class="error-state">❌ Lỗi tải ước lượng chi phí</div>';
        }
    }
}

// Hàm lấy tên trạng thái cho cost estimate
function getCostEstimateStatusName(status) {
    const statuses = {
        "draft": "📝 Nháp",
        "submitted": "📤 Đã gửi",
        "approved": "✅ Đã duyệt",
        "rejected": "❌ Từ chối"
    };
    return statuses[status] || status;
}

// Hiển thị modal thêm ước lượng chi phí
async function showAddCostEstimateModal() {
    if (currentUserRoleInProject !== 'manager') {
        showCustomAlert("Không có quyền!", "Chỉ quản lý mới có thể thêm ước lượng chi phí", "❌");
        return;
    }
    
    try {
        const tasks = await getProjectTasks(currentProjectCode);
        const taskSelect = document.getElementById("costEstimateTaskId");
        if (taskSelect) {
            taskSelect.innerHTML = '<option value="">-- Chọn công việc --</option>' + 
                tasks.map(task => `
                    <option value="${task.task_id}">${escapeHtml(task.task_name)}</option>
                `).join("");
        }
        
        // Reset form
        document.getElementById("addCostEstimateForm")?.reset();
        document.getElementById("laborCost").value = 0;
        document.getElementById("equipmentCost").value = 0;
        document.getElementById("officeSuppliesCost").value = 0;
        document.getElementById("trainingCost").value = 0;
        document.getElementById("travelCost").value = 0;
        document.getElementById("otherCost").value = 0;
        document.getElementById("totalCost").value = 0;
        document.getElementById("costEstimateNotes").value = "";
        
        // Thêm event listeners để tính tổng
        const costInputs = ["laborCost", "equipmentCost", "officeSuppliesCost", "trainingCost", "travelCost", "otherCost"];
        costInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.removeEventListener("input", calculateTotalCost);
                element.addEventListener("input", calculateTotalCost);
            }
        });
        
        const modal = document.getElementById("costEstimateModal");
        if (modal) {
            modal.style.display = "flex";
        }
        
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    }
}

function closeCostEstimateModal() {
    const modal = document.getElementById("costEstimateModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// Tính tổng chi phí
function calculateTotalCost() {
    const labor = parseFloat(document.getElementById("laborCost").value) || 0;
    const equipment = parseFloat(document.getElementById("equipmentCost").value) || 0;
    const office = parseFloat(document.getElementById("officeSuppliesCost").value) || 0;
    const training = parseFloat(document.getElementById("trainingCost").value) || 0;
    const travel = parseFloat(document.getElementById("travelCost").value) || 0;
    const other = parseFloat(document.getElementById("otherCost").value) || 0;
    
    const total = labor + equipment + office + training + travel + other;
    document.getElementById("totalCost").value = total;
    return total;
}

// Thêm ước lượng chi phí
async function addCostEstimate() {
    const taskId = document.getElementById("costEstimateTaskId").value;
    if (!taskId) {
        showCustomAlert("Thiếu thông tin", "Vui lòng chọn công việc", "❌");
        return;
    }
    
    const user = getUserInfo();
    const estimateData = {
        project_id: currentProjectCode,
        task_id: parseInt(taskId),
        expert_id: user.user_id,
        labor_cost: parseFloat(document.getElementById("laborCost").value) || 0,
        equipment_cost: parseFloat(document.getElementById("equipmentCost").value) || 0,
        office_supplies_cost: parseFloat(document.getElementById("officeSuppliesCost").value) || 0,
        training_cost: parseFloat(document.getElementById("trainingCost").value) || 0,
        travel_cost: parseFloat(document.getElementById("travelCost").value) || 0,
        other_cost: parseFloat(document.getElementById("otherCost").value) || 0,
        total_cost: parseFloat(document.getElementById("totalCost").value) || 0,
        notes: document.getElementById("costEstimateNotes").value,
        status: "submitted"
    };
    
    const addButton = document.querySelector("#costEstimateModal .btn-primary");
    if (addButton) addButton.disabled = true;
    
    try {
        await createCostEstimate(estimateData);
        showCustomAlert("Thêm ước lượng thành công!", "Đã thêm ước lượng chi phí", "✅");
        closeCostEstimateModal();
        await loadCostEstimates();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (addButton) addButton.disabled = false;
    }
}

// Hiển thị modal sửa ước lượng chi phí
async function showEditCostEstimateModal(estimateId) {
    if (currentUserRoleInProject !== 'manager') {
        showCustomAlert("Không có quyền!", "Chỉ quản lý mới có thể sửa ước lượng chi phí", "❌");
        return;
    }
    
    try {
        const estimates = await getProjectCostEstimates(currentProjectCode);
        const estimate = estimates.find(e => e.estimate_id === estimateId);
        
        if (!estimate) {
            showCustomAlert("Lỗi!", "Không tìm thấy ước lượng", "❌");
            return;
        }
        
        const tasks = await getProjectTasks(currentProjectCode);
        const task = tasks.find(t => t.task_id === estimate.task_id);
        
        currentEditingCostEstimate = estimate;
        
        document.getElementById("editCostTaskName").value = task?.task_name || `Công việc #${estimate.task_id}`;
        document.getElementById("editLaborCost").value = estimate.labor_cost;
        document.getElementById("editEquipmentCost").value = estimate.equipment_cost;
        document.getElementById("editOfficeSuppliesCost").value = estimate.office_supplies_cost;
        document.getElementById("editTrainingCost").value = estimate.training_cost;
        document.getElementById("editTravelCost").value = estimate.travel_cost;
        document.getElementById("editOtherCost").value = estimate.other_cost;
        document.getElementById("editTotalCost").value = estimate.total_cost;
        document.getElementById("editCostEstimateNotes").value = estimate.notes || "";
        
        // Thêm event listeners
        const costInputs = ["editLaborCost", "editEquipmentCost", "editOfficeSuppliesCost", "editTrainingCost", "editTravelCost", "editOtherCost"];
        costInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.removeEventListener("input", calculateEditTotalCost);
                element.addEventListener("input", calculateEditTotalCost);
            }
        });
        
        const modal = document.getElementById("editCostEstimateModal");
        if (modal) {
            modal.style.display = "flex";
        }
        
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    }
}

function closeEditCostEstimateModal() {
    const modal = document.getElementById("editCostEstimateModal");
    if (modal) {
        modal.style.display = "none";
    }
    currentEditingCostEstimate = null;
}

// Tính tổng chi phí cho modal sửa
function calculateEditTotalCost() {
    const labor = parseFloat(document.getElementById("editLaborCost").value) || 0;
    const equipment = parseFloat(document.getElementById("editEquipmentCost").value) || 0;
    const office = parseFloat(document.getElementById("editOfficeSuppliesCost").value) || 0;
    const training = parseFloat(document.getElementById("editTrainingCost").value) || 0;
    const travel = parseFloat(document.getElementById("editTravelCost").value) || 0;
    const other = parseFloat(document.getElementById("editOtherCost").value) || 0;
    
    const total = labor + equipment + office + training + travel + other;
    document.getElementById("editTotalCost").value = total;
    return total;
}

// Cập nhật ước lượng chi phí
async function confirmUpdateCostEstimate() {
    if (!currentEditingCostEstimate) return;
    
    const updateData = {
        labor_cost: parseFloat(document.getElementById("editLaborCost").value) || 0,
        equipment_cost: parseFloat(document.getElementById("editEquipmentCost").value) || 0,
        office_supplies_cost: parseFloat(document.getElementById("editOfficeSuppliesCost").value) || 0,
        training_cost: parseFloat(document.getElementById("editTrainingCost").value) || 0,
        travel_cost: parseFloat(document.getElementById("editTravelCost").value) || 0,
        other_cost: parseFloat(document.getElementById("editOtherCost").value) || 0,
        total_cost: parseFloat(document.getElementById("editTotalCost").value) || 0,
        notes: document.getElementById("editCostEstimateNotes").value
    };
    
    const saveButton = document.querySelector("#editCostEstimateModal .btn-primary");
    if (saveButton) saveButton.disabled = true;
    
    try {
        await updateCostEstimate(currentEditingCostEstimate.estimate_id, updateData);
        showCustomAlert("Cập nhật thành công!", "Đã cập nhật ước lượng chi phí", "✅");
        closeEditCostEstimateModal();
        await loadCostEstimates();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

// Xóa ước lượng chi phí
let pendingDeleteCostEstimate = null;

function showConfirmDeleteCostEstimateModal(estimateId, taskName) {
    pendingDeleteCostEstimate = {
        id: estimateId,
        task_name: taskName
    };
    
    const messageEl = document.getElementById("deleteCostEstimateConfirmMessage");
    const subMessageEl = document.getElementById("deleteCostEstimateConfirmSubmessage");
    
    if (messageEl) {
        messageEl.innerHTML = `💰 Xóa ước lượng chi phí?`;
    }
    if (subMessageEl) {
        subMessageEl.innerHTML = `Bạn có chắc chắn muốn xóa ước lượng chi phí cho công việc <strong>"${escapeHtml(taskName)}"</strong>?<br>Hành động này không thể hoàn tác!`;
    }
    
    const modal = document.getElementById("confirmDeleteCostEstimateModal");
    if (modal) {
        modal.style.display = "flex";
    }
}

function closeConfirmDeleteCostEstimateModal() {
    const modal = document.getElementById("confirmDeleteCostEstimateModal");
    if (modal) {
        modal.style.display = "none";
    }
    pendingDeleteCostEstimate = null;
}

async function executeDeleteCostEstimate() {
    if (!pendingDeleteCostEstimate) return;
    
    const deleteButton = document.getElementById("confirmDeleteCostEstimateBtn");
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.textContent = "⏳ Đang xóa...";
    }
    
    try {
        await deleteCostEstimate(pendingDeleteCostEstimate.id);
        showCustomAlert("Xóa thành công!", `Đã xóa ước lượng chi phí cho công việc "${pendingDeleteCostEstimate.task_name}"`, "✅");
        closeConfirmDeleteCostEstimateModal();
        await loadCostEstimates();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.textContent = "🗑️ Xóa";
        }
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

    const addTimeEstimateBtn = document.getElementById("addTimeEstimateBtn");
    if (addTimeEstimateBtn) {
        addTimeEstimateBtn.onclick = () => { showAddTimeEstimateModal(); };
    }
    
    // Member form
    const addMemberForm = document.getElementById("addMemberForm");
    if (addMemberForm) addMemberForm.onsubmit = (e) => { e.preventDefault(); addMemberToProject(); };
    
    // Task form
    const addTaskForm = document.getElementById("addTaskForm");
    if (addTaskForm) addTaskForm.onsubmit = (e) => { e.preventDefault(); addTaskToProject(); };


    const addEstimateBtn = document.getElementById("addEstimateBtn");
    if (addEstimateBtn) addEstimateBtn.onclick = showAddCostEstimateModal;
    
    // Click outside modal to close
    window.onclick = (e) => {
        const memberModal = document.getElementById("memberModal");
        const taskModal = document.getElementById("taskModal");
        const editRoleModal = document.getElementById("editRoleModal");
        const confirmDeleteModal = document.getElementById("confirmDeleteModal");
        const editTaskModal = document.getElementById("editTaskModal");
        const confirmDeleteTaskModal = document.getElementById("confirmDeleteTaskModal");
        const timeEstimateModal = document.getElementById("timeEstimateModal");
        const costEstimateModal = document.getElementById("costEstimateModal");
        const editCostEstimateModal = document.getElementById("editCostEstimateModal");
        const confirmDeleteCostEstimateModal = document.getElementById("confirmDeleteCostEstimateModal");
        
        if (e.target === memberModal) closeMemberModal();
        if (e.target === taskModal) closeTaskModal();
        if (e.target === editRoleModal) closeEditRoleModal();
        if (e.target === confirmDeleteModal) closeConfirmDeleteModal();
        if (e.target === editTaskModal) closeEditTaskModal();
        if (e.target === confirmDeleteTaskModal) closeConfirmDeleteTaskModal();
        if (e.target === timeEstimateModal) closeTimeEstimateModal();
        if (e.target === costEstimateModal) closeCostEstimateModal();
        if (e.target === editCostEstimateModal) closeEditCostEstimateModal();
        if (e.target === confirmDeleteCostEstimateModal) closeConfirmDeleteCostEstimateModal();
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