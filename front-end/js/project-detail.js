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
        await loadProjectSchedule();
        await loadTaskSchedules();
        
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




// ==================== QUẢN LÝ LỊCH TRÌNH DỰ ÁN ====================
let currentEditingMilestone = null;
let pendingDeleteMilestone = null;

// Load danh sách cột mốc
async function loadProjectSchedule() {
    try {
        const milestones = await getProjectMilestones(currentProjectCode);
        const listContainer = document.getElementById("scheduleListView");
        const timelineContainer = document.getElementById("timelineView");
        const ganttContainer = document.getElementById("ganttView");
        
        if (!listContainer) return;
        
        if (!milestones || milestones.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">📅 Chưa có cột mốc nào. Hãy thêm cột mốc đầu tiên!</div>';
            if (timelineContainer) timelineContainer.innerHTML = '';
            if (ganttContainer) ganttContainer.innerHTML = '';
            return;
        }
        
        const isManager = currentUserRoleInProject === 'manager';
        const sortedMilestones = [...milestones].sort((a, b) => new Date(a.milestone_date) - new Date(b.milestone_date));
        
        // Hiển thị danh sách
        listContainer.innerHTML = sortedMilestones.map(milestone => `
            <div class="schedule-card ${milestone.status}" data-schedule-id="${milestone.schedule_id}">
                <div class="schedule-header">
                    <div class="schedule-title">
                        ${getMilestoneIcon(milestone.milestone_type)} ${escapeHtml(milestone.milestone_name)}
                    </div>
                    <div class="schedule-badges">
                        <span class="schedule-type ${milestone.milestone_type}">${getMilestoneTypeName(milestone.milestone_type)}</span>
                        <span class="schedule-status status-${milestone.status}">${getMilestoneStatusName(milestone.status)}</span>
                    </div>
                </div>
                ${milestone.milestone_description ? `<div class="schedule-desc">📝 ${escapeHtml(milestone.milestone_description)}</div>` : ''}
                <div class="schedule-date">
                    📅 ${new Date(milestone.milestone_date).toLocaleDateString('vi-VN')}
                </div>
                <div class="schedule-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${milestone.actual_progress || 0}%"></div>
                    </div>
                    <div style="font-size: 12px; margin-top: 5px;">Tiến độ: ${milestone.actual_progress || 0}%</div>
                </div>
                ${milestone.notes ? `<div class="schedule-notes">📌 ${escapeHtml(milestone.notes)}</div>` : ''}
                <div class="schedule-footer">
                    <div class="schedule-meta">
                        <small>🕐 Cập nhật: ${new Date(milestone.updated_at).toLocaleDateString('vi-VN')}</small>
                    </div>
                    ${isManager ? `
                        <div class="schedule-actions">
                            <button onclick="showEditMilestoneModal(${milestone.schedule_id})" class="btn-icon" title="Sửa">✏️</button>
                            <button onclick="showConfirmDeleteMilestoneModal(${milestone.schedule_id}, '${escapeHtml(milestone.milestone_name)}')" class="btn-icon btn-danger" title="Xóa">🗑️</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join("");
        
        // Render các view khác nếu đang active
        const activeView = document.querySelector('.view-btn.active')?.dataset?.view || 'list';
        
        if (activeView === 'gantt') {
            const ganttContainer = document.getElementById("ganttView");
            if (ganttContainer) ganttContainer.style.display = 'block';
            renderGanttChart();
        } else if (activeView === 'timeline') {
            const timelineContainer = document.getElementById("timelineView");
            if (timelineContainer) timelineContainer.style.display = 'block';
            renderTimeline();
        } else {
            // Ẩn các view khác
            if (timelineContainer) timelineContainer.style.display = 'none';
            if (ganttContainer) ganttContainer.style.display = 'none';
        }
        
    } catch (error) {
        console.error("Error loading project schedule:", error);
        const container = document.getElementById("scheduleListView");
        if (container) {
            container.innerHTML = '<div class="error-state">❌ Lỗi tải lịch trình dự án</div>';
        }
    }
}

// Cuộn đến cột mốc
function scrollToMilestone(scheduleId) {
    const element = document.querySelector(`.schedule-card[data-schedule-id="${scheduleId}"]`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.style.backgroundColor = '#fff3cd';
        setTimeout(() => {
            element.style.backgroundColor = '';
        }, 2000);
    }
}

// Lấy icon cho cột mốc
function getMilestoneIcon(type) {
    const icons = {
        'start': '🚀',
        'end': '🏁',
        'phase_start': '📌',
        'phase_end': '✅',
        'review': '🔍',
        'delivery': '📦',
        'other': '📋'
    };
    return icons[type] || '📅';
}

// Lấy tên loại cột mốc
function getMilestoneTypeName(type) {
    const names = {
        'start': 'Bắt đầu dự án',
        'end': 'Kết thúc dự án',
        'phase_start': 'Bắt đầu giai đoạn',
        'phase_end': 'Kết thúc giai đoạn',
        'review': 'Đánh giá',
        'delivery': 'Bàn giao',
        'other': 'Khác'
    };
    return names[type] || type;
}

// Lấy tên trạng thái cột mốc
function getMilestoneStatusName(status) {
    const names = {
        'pending': '⏳ Đang chờ',
        'in_progress': '🔄 Đang thực hiện',
        'completed': '✅ Hoàn thành',
        'delayed': '⚠️ Trễ hạn',
        'cancelled': '❌ Đã hủy'
    };
    return names[status] || status;
}

// Hiển thị modal thêm cột mốc
async function showAddMilestoneModal() {
    if (currentUserRoleInProject !== 'manager') {
        showCustomAlert("Không có quyền!", "Chỉ quản lý mới có thể thêm cột mốc", "❌");
        return;
    }
    
    // Reset form
    document.getElementById("addMilestoneForm")?.reset();
    document.getElementById("milestoneDate").value = new Date().toISOString().split('T')[0];
    document.getElementById("milestoneProgress").value = 0;
    document.getElementById("progressValue").textContent = "0%";
    
    // Thêm event cho progress slider
    const progressSlider = document.getElementById("milestoneProgress");
    const progressValue = document.getElementById("progressValue");
    if (progressSlider && progressValue) {
        progressSlider.oninput = function() {
            progressValue.textContent = this.value + "%";
        };
    }
    
    const modal = document.getElementById("milestoneModal");
    if (modal) {
        modal.style.display = "flex";
    }
}

function closeMilestoneModal() {
    const modal = document.getElementById("milestoneModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// Thêm cột mốc
async function addMilestone() {
    const milestoneName = document.getElementById("milestoneName").value;
    if (!milestoneName) {
        showCustomAlert("Thiếu thông tin", "Vui lòng nhập tên cột mốc", "❌");
        return;
    }
    
    const milestoneDate = document.getElementById("milestoneDate").value;
    if (!milestoneDate) {
        showCustomAlert("Thiếu thông tin", "Vui lòng chọn ngày thực hiện", "❌");
        return;
    }
    
    const user = getUserInfo();
    const milestoneData = {
        project_id: currentProjectCode,
        milestone_name: milestoneName,
        milestone_description: document.getElementById("milestoneDescription").value,
        milestone_date: milestoneDate,
        milestone_type: document.getElementById("milestoneType").value,
        status: document.getElementById("milestoneStatus").value,
        actual_progress: parseInt(document.getElementById("milestoneProgress").value) || 0,
        notes: document.getElementById("milestoneNotes").value,
        updated_by: user.user_id
    };
    
    const addButton = document.querySelector("#milestoneModal .btn-primary");
    if (addButton) addButton.disabled = true;
    
    try {
        await createProjectMilestone(milestoneData);
        showCustomAlert("Thêm thành công!", "Đã thêm cột mốc mới", "✅");
        closeMilestoneModal();
        await loadProjectSchedule();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (addButton) addButton.disabled = false;
    }
}

// Hiển thị modal sửa cột mốc
async function showEditMilestoneModal(scheduleId) {
    if (currentUserRoleInProject !== 'manager') {
        showCustomAlert("Không có quyền!", "Chỉ quản lý mới có thể sửa cột mốc", "❌");
        return;
    }
    
    try {
        const milestones = await getProjectMilestones(currentProjectCode);
        const milestone = milestones.find(m => m.schedule_id === scheduleId);
        
        if (!milestone) {
            showCustomAlert("Lỗi!", "Không tìm thấy cột mốc", "❌");
            return;
        }
        
        currentEditingMilestone = milestone;
        
        document.getElementById("editMilestoneName").value = milestone.milestone_name;
        document.getElementById("editMilestoneDescription").value = milestone.milestone_description || "";
        document.getElementById("editMilestoneDate").value = milestone.milestone_date;
        document.getElementById("editMilestoneType").value = milestone.milestone_type;
        document.getElementById("editMilestoneStatus").value = milestone.status;
        document.getElementById("editMilestoneProgress").value = milestone.actual_progress || 0;
        document.getElementById("editProgressValue").textContent = `${milestone.actual_progress || 0}%`;
        document.getElementById("editMilestoneNotes").value = milestone.notes || "";
        
        // Thêm event cho progress slider
        const progressSlider = document.getElementById("editMilestoneProgress");
        const progressValue = document.getElementById("editProgressValue");
        if (progressSlider && progressValue) {
            progressSlider.oninput = function() {
                progressValue.textContent = this.value + "%";
            };
        }
        
        const modal = document.getElementById("editMilestoneModal");
        if (modal) {
            modal.style.display = "flex";
        }
        
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    }
}

function closeEditMilestoneModal() {
    const modal = document.getElementById("editMilestoneModal");
    if (modal) {
        modal.style.display = "none";
    }
    currentEditingMilestone = null;
}

// Cập nhật cột mốc
async function confirmUpdateMilestone() {
    if (!currentEditingMilestone) return;
    
    const user = getUserInfo();
    const updateData = {
        milestone_name: document.getElementById("editMilestoneName").value,
        milestone_description: document.getElementById("editMilestoneDescription").value,
        milestone_date: document.getElementById("editMilestoneDate").value,
        milestone_type: document.getElementById("editMilestoneType").value,
        status: document.getElementById("editMilestoneStatus").value,
        actual_progress: parseInt(document.getElementById("editMilestoneProgress").value) || 0,
        notes: document.getElementById("editMilestoneNotes").value,
        updated_by: user.user_id
    };
    
    if (!updateData.milestone_name) {
        showCustomAlert("Thiếu thông tin", "Vui lòng nhập tên cột mốc", "❌");
        return;
    }
    
    const saveButton = document.querySelector("#editMilestoneModal .btn-primary");
    if (saveButton) saveButton.disabled = true;
    
    try {
        await updateProjectMilestone(currentEditingMilestone.schedule_id, updateData);
        showCustomAlert("Cập nhật thành công!", "Đã cập nhật cột mốc", "✅");
        closeEditMilestoneModal();
        await loadProjectSchedule();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

// Xóa cột mốc
function showConfirmDeleteMilestoneModal(scheduleId, milestoneName) {
    pendingDeleteMilestone = {
        id: scheduleId,
        name: milestoneName
    };
    
    const messageEl = document.getElementById("deleteMilestoneConfirmMessage");
    if (messageEl) {
        messageEl.innerHTML = `🗑️ Xóa cột mốc "${escapeHtml(milestoneName)}"?`;
    }
    
    const modal = document.getElementById("confirmDeleteMilestoneModal");
    if (modal) {
        modal.style.display = "flex";
    }
}

function closeConfirmDeleteMilestoneModal() {
    const modal = document.getElementById("confirmDeleteMilestoneModal");
    if (modal) {
        modal.style.display = "none";
    }
    pendingDeleteMilestone = null;
}

async function executeDeleteMilestone() {
    if (!pendingDeleteMilestone) return;
    
    const deleteButton = document.getElementById("confirmDeleteMilestoneBtn");
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.textContent = "⏳ Đang xóa...";
    }
    
    try {
        await deleteProjectMilestone(pendingDeleteMilestone.id);
        showCustomAlert("Xóa thành công!", `Đã xóa cột mốc "${pendingDeleteMilestone.name}"`, "✅");
        closeConfirmDeleteMilestoneModal();
        await loadProjectSchedule();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.textContent = "🗑️ Xóa";
        }
    }
}







// ==================== BIỂU ĐỒ GANTT ====================
let currentView = 'list';
let ganttZoomLevel = 1;
let ganttStartDate = null;
let ganttEndDate = null;

// Chuyển đổi view
// Sửa lại hàm switchScheduleView:
function switchScheduleView(view) {
    currentView = view;
    
    const listView = document.getElementById("scheduleListView");
    const timelineView = document.getElementById("timelineView");
    const ganttView = document.getElementById("ganttView");
    const viewBtns = document.querySelectorAll(".view-btn");
    
    // Cập nhật active button - dùng dataset
    viewBtns.forEach(btn => {
        btn.classList.remove("active");
        if (btn.getAttribute("data-view") === view) {
            btn.classList.add("active");
        }
    });
    
    // Hiển thị view tương ứng
    if (listView) listView.style.display = view === 'list' ? 'block' : 'none';
    if (timelineView) timelineView.style.display = view === 'timeline' ? 'block' : 'none';
    if (ganttView) ganttView.style.display = view === 'gantt' ? 'block' : 'none';
    
    // Load lại dữ liệu cho view hiện tại
    if (view === 'gantt') {
        renderGanttChart();
    } else if (view === 'timeline') {
        renderTimeline();
    }
}

// Render Timeline
async function renderTimeline() {
    try {
        const milestones = await getProjectMilestones(currentProjectCode);
        const timelineContainer = document.getElementById("timelineView");
        
        if (!timelineContainer) return;
        
        if (!milestones || milestones.length === 0) {
            timelineContainer.innerHTML = '<div class="empty-state">📅 Chưa có cột mốc nào</div>';
            return;
        }
        
        const sortedMilestones = [...milestones].sort((a, b) => new Date(a.milestone_date) - new Date(b.milestone_date));
        
        timelineContainer.innerHTML = `
            <div class="timeline">
                <div class="timeline-line"></div>
                ${sortedMilestones.map(milestone => `
                    <div class="timeline-node ${milestone.status}" onclick="scrollToMilestone(${milestone.schedule_id})">
                        <div class="timeline-dot">${getMilestoneIcon(milestone.milestone_type)}</div>
                        <div class="timeline-date">${new Date(milestone.milestone_date).toLocaleDateString()}</div>
                        <div class="timeline-title">${escapeHtml(milestone.milestone_name.substring(0, 20))}${milestone.milestone_name.length > 20 ? '...' : ''}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error("Error rendering timeline:", error);
    }
}

// Render Gantt Chart
async function renderGanttChart() {
    try {
        const milestones = await getProjectMilestones(currentProjectCode);
        const container = document.getElementById("ganttChart");
        
        if (!container) return;
        
        if (!milestones || milestones.length === 0) {
            container.innerHTML = '<div class="empty-state">📅 Chưa có cột mốc nào để hiển thị Gantt</div>';
            return;
        }
        
        // Xác định khoảng thời gian
        const dates = milestones.map(m => new Date(m.milestone_date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        // Mở rộng biên độ 14 ngày
        ganttStartDate = new Date(minDate);
        ganttStartDate.setDate(ganttStartDate.getDate() - 14);
        ganttEndDate = new Date(maxDate);
        ganttEndDate.setDate(ganttEndDate.getDate() + 14);
        
        const totalDays = Math.ceil((ganttEndDate - ganttStartDate) / (1000 * 60 * 60 * 24));
        const visibleDays = Math.max(totalDays, 30) / ganttZoomLevel;
        
        // Tạo header tháng
        const months = [];
        let currentMonth = new Date(ganttStartDate);
        while (currentMonth <= ganttEndDate) {
            months.push({
                name: currentMonth.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
                start: new Date(currentMonth),
                end: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
            });
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        
        // Tạo header HTML
        let headerHtml = `<div class="gantt-timeline">`;
        months.forEach(month => {
            const monthDays = Math.ceil((month.end - month.start) / (1000 * 60 * 60 * 24)) + 1;
            const widthPercent = (monthDays / totalDays) * 100;
            headerHtml += `<div class="gantt-timeline-month" style="width: ${widthPercent}%">${month.name}</div>`;
        });
        headerHtml += `</div>`;
        
        // Tạo các hàng Gantt
        let rowsHtml = `<div class="gantt-rows">`;
        
        for (const milestone of milestones) {
            const milestoneDate = new Date(milestone.milestone_date);
            const daysFromStart = Math.ceil((milestoneDate - ganttStartDate) / (1000 * 60 * 60 * 24));
            const leftPercent = (daysFromStart / totalDays) * 100;
            
            // Mỗi milestone hiển thị dưới dạng 1 điểm (cột mốc)
            rowsHtml += `
                <div class="gantt-row" onclick="scrollToMilestone(${milestone.schedule_id})">
                    <div class="gantt-label" title="${escapeHtml(milestone.milestone_name)}">
                        ${getMilestoneIcon(milestone.milestone_type)} ${escapeHtml(milestone.milestone_name)}
                        <span style="font-size: 11px; color: #666; display: block;">
                            ${new Date(milestone.milestone_date).toLocaleDateString()}
                        </span>
                    </div>
                    <div class="gantt-bars">
                        <div class="gantt-bar ${milestone.status}" 
                             style="left: ${leftPercent}%; width: 2%; min-width: 60px;"
                             title="${escapeHtml(milestone.milestone_name)} - ${new Date(milestone.milestone_date).toLocaleDateString()}">
                            📍 ${milestone.actual_progress || 0}%
                        </div>
                    </div>
                </div>
            `;
        }
        
        rowsHtml += `</div>`;
        
        // Thêm đường "Hôm nay"
        const today = new Date();
        let todayLineHtml = '';
        if (today >= ganttStartDate && today <= ganttEndDate) {
            const todayDaysFromStart = Math.ceil((today - ganttStartDate) / (1000 * 60 * 60 * 24));
            const todayLeftPercent = (todayDaysFromStart / totalDays) * 100;
            todayLineHtml = `<div class="gantt-today-line" style="left: ${todayLeftPercent}%"></div>`;
        }
        
        container.innerHTML = `
            ${headerHtml}
            <div style="position: relative;">
                ${todayLineHtml}
                ${rowsHtml}
            </div>
        `;
        
    } catch (error) {
        console.error("Error rendering Gantt chart:", error);
        const container = document.getElementById("ganttChart");
        if (container) {
            container.innerHTML = '<div class="error-state">❌ Lỗi tải biểu đồ Gantt</div>';
        }
    }
}






// ==================== QUYỀN CHO LỊCH TRÌNH CÔNG VIỆC ====================
function canManageSchedule() {
    return currentUserRoleInProject === 'manager';
}


// ==================== LỊCH TRÌNH CÔNG VIỆC ====================
let currentEditingTaskSchedule = null;
let pendingDeleteTaskSchedule = null;

// Load danh sách lịch trình công việc
async function loadTaskSchedules() {
    try {
        const schedules = await getTaskSchedules(currentProjectCode);
        const container = document.getElementById("taskScheduleList");
        const calendarContainer = document.getElementById("taskScheduleGrid");
        const headerContainer = document.getElementById("taskScheduleHeader");
        
        if (!container) return;
        
        if (!schedules || schedules.length === 0) {
            container.innerHTML = '<div class="empty-state">📅 Chưa có lịch trình công việc nào</div>';
            if (calendarContainer) calendarContainer.innerHTML = '';
            if (headerContainer) headerContainer.innerHTML = '';
            return;
        }
        
        // Lấy thông tin tasks và users
        const tasks = await getProjectTasks(currentProjectCode);
        const users = await getUsers();
        const members = await getProjectMembers(currentProjectCode);
        
        const taskMap = new Map();
        tasks.forEach(task => taskMap.set(task.task_id, task));
        
        const userMap = new Map();
        users.forEach(user => userMap.set(user.user_id, user));
        
        const memberMap = new Map();
        members.forEach(member => memberMap.set(member.user_id, member));
        
        const canEdit = canManageSchedule();
        
        // Hiển thị danh sách
        container.innerHTML = schedules.map(schedule => {
            const task = taskMap.get(schedule.task_id);
            const user = userMap.get(schedule.user_id);
            
            return `
                <div class="task-schedule-card" data-schedule-id="${schedule.schedule_id}">
                    <div class="task-schedule-info">
                        <span class="task-name">📋 ${task?.task_name || `Task #${schedule.task_id}`}</span>
                        <span class="user-name">👤 ${user?.fullname || `User #${schedule.user_id}`}</span>
                        <div class="schedule-date">📅 ${new Date(schedule.scheduled_date).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <div class="task-schedule-hours">
                        <div class="planned">⏱️ Dự kiến: ${schedule.scheduled_hours}h</div>
                        <div class="actual">✅ Thực tế: ${schedule.actual_hours || 0}h</div>
                    </div>
                    ${canEdit ? `
                        <div class="task-schedule-actions">
                            <button onclick="showEditTaskScheduleModal(${schedule.schedule_id})" class="btn-icon" title="Sửa">✏️</button>
                            <button onclick="showConfirmDeleteTaskScheduleModal(${schedule.schedule_id})" class="btn-icon btn-danger" title="Xóa">🗑️</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join("");
        
        // Hiển thị lịch dạng bảng
        await renderTaskScheduleCalendar(schedules, taskMap, userMap);
        
        // Cập nhật bộ lọc
        await updateScheduleFilters(members, userMap);
        
    } catch (error) {
        console.error("Error loading task schedules:", error);
        const container = document.getElementById("taskScheduleList");
        if (container) {
            container.innerHTML = '<div class="error-state">❌ Lỗi tải lịch trình công việc</div>';
        }
    }
}

// Hiển thị lịch dạng bảng
async function renderTaskScheduleCalendar(schedules, taskMap, userMap) {
    const calendarContainer = document.getElementById("taskScheduleGrid");
    const headerContainer = document.getElementById("taskScheduleHeader");
    
    if (!calendarContainer) return;
    
    // Lấy các ngày trong tuần hiện tại
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        weekDays.push(date);
    }
    
    // Tạo header
    headerContainer.innerHTML = `
        <div class="calendar-header-cell">Thành viên</div>
        ${weekDays.map(day => `
            <div class="calendar-header-cell">
                ${day.toLocaleDateString('vi-VN', { weekday: 'short' })}<br>
                ${day.toLocaleDateString('vi-VN')}
            </div>
        `).join('')}
    `;
    
    // Nhóm schedules theo user
    const schedulesByUser = new Map();
    schedules.forEach(schedule => {
        if (!schedulesByUser.has(schedule.user_id)) {
            schedulesByUser.set(schedule.user_id, []);
        }
        schedulesByUser.get(schedule.user_id).push(schedule);
    });
    
    // Tạo grid
    let gridHtml = '';
    for (const [userId, userSchedules] of schedulesByUser) {
        const user = userMap.get(userId);
        gridHtml += `<div class="calendar-row">`;
        gridHtml += `<div class="calendar-cell" style="background: #f8f9fa; font-weight: bold;">${user?.fullname || `User #${userId}`}</div>`;
        
        for (const day of weekDays) {
            const dayStr = day.toISOString().split('T')[0];
            const schedule = userSchedules.find(s => s.scheduled_date === dayStr);
            const isToday = day.toDateString() === new Date().toDateString();
            
            gridHtml += `
                <div class="calendar-cell ${isToday ? 'today' : ''}">
                    ${schedule ? `
                        <div class="schedule-item" onclick="showEditTaskScheduleModal(${schedule.schedule_id})">
                            📋 ${taskMap.get(schedule.task_id)?.task_name?.substring(0, 15) || `Task #${schedule.task_id}`}
                        </div>
                        <div class="schedule-item hours">
                            ⏱️ ${schedule.scheduled_hours}h
                        </div>
                        ${schedule.actual_hours > 0 ? `
                            <div class="schedule-item actual">
                                ✅ ${schedule.actual_hours}h
                            </div>
                        ` : ''}
                    ` : '—'}
                </div>
            `;
        }
        gridHtml += `</div>`;
    }
    
    calendarContainer.innerHTML = gridHtml;
}

// Cập nhật bộ lọc
async function updateScheduleFilters(members, userMap) {
    const userFilter = document.getElementById("filterTaskScheduleUser");
    if (userFilter) {
        userFilter.innerHTML = '<option value="all">👥 Tất cả thành viên</option>' + 
            members.map(member => `
                <option value="${member.user_id}">${userMap.get(member.user_id)?.fullname || `User #${member.user_id}`}</option>
            `).join('');
    }
}

// Lọc lịch trình
async function filterTaskSchedule() {
    const userId = document.getElementById("filterTaskScheduleUser").value;
    const weekFilter = document.getElementById("filterTaskScheduleWeek").value;
    const dateFilter = document.getElementById("filterTaskScheduleDate").value;
    
    let schedules = await getTaskSchedules(currentProjectCode);
    
    if (userId !== 'all') {
        schedules = schedules.filter(s => s.user_id == userId);
    }
    
    if (dateFilter) {
        schedules = schedules.filter(s => s.scheduled_date === dateFilter);
    } else if (weekFilter === 'current') {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        schedules = schedules.filter(s => {
            const date = new Date(s.scheduled_date);
            return date >= startOfWeek && date <= endOfWeek;
        });
    } else if (weekFilter === 'next') {
        const today = new Date();
        const startOfNextWeek = new Date(today);
        startOfNextWeek.setDate(today.getDate() - today.getDay() + 8);
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
        schedules = schedules.filter(s => {
            const date = new Date(s.scheduled_date);
            return date >= startOfNextWeek && date <= endOfNextWeek;
        });
    }
    
    // Hiển thị lại danh sách đã lọc
    const tasks = await getProjectTasks(currentProjectCode);
    const users = await getUsers();
    const taskMap = new Map();
    tasks.forEach(task => taskMap.set(task.task_id, task));
    const userMap = new Map();
    users.forEach(user => userMap.set(user.user_id, user));
    
    const container = document.getElementById("taskScheduleList");
    const canEdit = canManageSchedule();
    
    if (schedules.length === 0) {
        container.innerHTML = '<div class="empty-state">📅 Không có lịch trình nào phù hợp</div>';
        return;
    }
    
    container.innerHTML = schedules.map(schedule => {
        const task = taskMap.get(schedule.task_id);
        const user = userMap.get(schedule.user_id);
        return `
            <div class="task-schedule-card">
                <div class="task-schedule-info">
                    <span class="task-name">📋 ${task?.task_name || `Task #${schedule.task_id}`}</span>
                    <span class="user-name">👤 ${user?.fullname || `User #${schedule.user_id}`}</span>
                    <div class="schedule-date">📅 ${new Date(schedule.scheduled_date).toLocaleDateString('vi-VN')}</div>
                </div>
                <div class="task-schedule-hours">
                    <div class="planned">⏱️ Dự kiến: ${schedule.scheduled_hours}h</div>
                    <div class="actual">✅ Thực tế: ${schedule.actual_hours || 0}h</div>
                </div>
                ${canEdit ? `
                    <div class="task-schedule-actions">
                        <button onclick="showEditTaskScheduleModal(${schedule.schedule_id})" class="btn-icon" title="Sửa">✏️</button>
                        <button onclick="showConfirmDeleteTaskScheduleModal(${schedule.schedule_id})" class="btn-icon btn-danger" title="Xóa">🗑️</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join("");
}

function resetTaskScheduleFilter() {
    document.getElementById("filterTaskScheduleUser").value = 'all';
    document.getElementById("filterTaskScheduleWeek").value = 'current';
    document.getElementById("filterTaskScheduleDate").value = '';
    loadTaskSchedules();
}

// Hiển thị modal thêm lịch trình
async function showAddTaskScheduleModal() {
    if (!canManageSchedule()) {
        showCustomAlert("Không có quyền!", "Chỉ quản lý mới có thể thêm lịch trình", "❌");
        return;
    }
    
    try {
        const tasks = await getProjectTasks(currentProjectCode);
        const members = await getProjectMembers(currentProjectCode);
        const users = await getUsers();
        
        const taskSelect = document.getElementById("scheduleTaskId");
        const userSelect = document.getElementById("scheduleUserId");
        
        if (taskSelect) {
            taskSelect.innerHTML = '<option value="">-- Chọn công việc --</option>' + 
                tasks.map(task => `<option value="${task.task_id}">${escapeHtml(task.task_name)}</option>`).join("");
        }
        
        if (userSelect) {
            const userMap = new Map();
            users.forEach(user => userMap.set(user.user_id, user));
            userSelect.innerHTML = '<option value="">-- Chọn thành viên --</option>' + 
                members.map(member => `<option value="${member.user_id}">${userMap.get(member.user_id)?.fullname || `User #${member.user_id}`}</option>`).join("");
        }
        
        document.getElementById("scheduleDate").value = new Date().toISOString().split('T')[0];
        document.getElementById("scheduledHours").value = 8;
        document.getElementById("actualHours").value = 0;
        document.getElementById("scheduleNotes").value = "";
        
        const modal = document.getElementById("taskScheduleModal");
        if (modal) modal.style.display = "flex";
        
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    }
}

function closeTaskScheduleModal() {
    const modal = document.getElementById("taskScheduleModal");
    if (modal) modal.style.display = "none";
}

// Thêm lịch trình
async function addTaskSchedule() {
    const taskId = document.getElementById("scheduleTaskId").value;
    const userId = document.getElementById("scheduleUserId").value;
    const scheduleDate = document.getElementById("scheduleDate").value;
    const scheduledHours = parseFloat(document.getElementById("scheduledHours").value);
    
    if (!taskId || !userId || !scheduleDate || !scheduledHours) {
        showCustomAlert("Thiếu thông tin", "Vui lòng điền đầy đủ thông tin", "❌");
        return;
    }
    
    const scheduleData = {
        project_id: currentProjectCode,
        task_id: parseInt(taskId),
        user_id: parseInt(userId),
        scheduled_date: scheduleDate,
        scheduled_hours: scheduledHours,
        actual_hours: parseFloat(document.getElementById("actualHours").value) || 0,
        notes: document.getElementById("scheduleNotes").value
    };
    
    const addButton = document.querySelector("#taskScheduleModal .btn-primary");
    if (addButton) addButton.disabled = true;
    
    try {
        await createTaskSchedule(scheduleData);
        showCustomAlert("Thêm thành công!", "Đã thêm lịch trình công việc", "✅");
        closeTaskScheduleModal();
        await loadTaskSchedules();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (addButton) addButton.disabled = false;
    }
}

// Các hàm sửa/xóa lịch trình tương tự...
async function showEditTaskScheduleModal(scheduleId) {
    if (!canManageSchedule()) {
        showCustomAlert("Không có quyền!", "Chỉ quản lý mới có thể sửa lịch trình", "❌");
        return;
    }
    
    try {
        const schedules = await getTaskSchedules(currentProjectCode);
        const schedule = schedules.find(s => s.schedule_id === scheduleId);
        
        if (!schedule) {
            showCustomAlert("Lỗi!", "Không tìm thấy lịch trình", "❌");
            return;
        }
        
        const tasks = await getProjectTasks(currentProjectCode);
        const users = await getUsers();
        const task = tasks.find(t => t.task_id === schedule.task_id);
        const user = users.find(u => u.user_id === schedule.user_id);
        
        currentEditingTaskSchedule = schedule;  // ✅ QUAN TRỌNG: phải có dòng này
        
        document.getElementById("editScheduleTaskName").value = task?.task_name || `Task #${schedule.task_id}`;
        document.getElementById("editScheduleUserName").value = user?.fullname || `User #${schedule.user_id}`;
        document.getElementById("editScheduleDate").value = schedule.scheduled_date;
        document.getElementById("editScheduledHours").value = schedule.scheduled_hours;
        document.getElementById("editActualHours").value = schedule.actual_hours || 0;
        document.getElementById("editScheduleNotes").value = schedule.notes || "";
        
        const modal = document.getElementById("editTaskScheduleModal");
        if (modal) modal.style.display = "flex";
        
    } catch (error) {
        console.error("Error in showEditTaskScheduleModal:", error);
        showCustomAlert("Lỗi!", error.message, "❌");
    }
}

async function confirmUpdateTaskSchedule() {
    if (!currentEditingTaskSchedule) {
        showCustomAlert("Lỗi!", "Không có lịch trình nào đang được sửa", "❌");
        return;
    }
    
    const updateData = {
        scheduled_date: document.getElementById("editScheduleDate").value,
        scheduled_hours: parseFloat(document.getElementById("editScheduledHours").value),
        actual_hours: parseFloat(document.getElementById("editActualHours").value) || 0,
        notes: document.getElementById("editScheduleNotes").value
    };
    
    if (!updateData.scheduled_date || !updateData.scheduled_hours) {
        showCustomAlert("Thiếu thông tin", "Vui lòng điền đầy đủ thông tin", "❌");
        return;
    }
    
    const saveButton = document.querySelector("#editTaskScheduleModal .btn-primary");
    if (saveButton) saveButton.disabled = true;
    
    try {
        await updateTaskSchedule(currentEditingTaskSchedule.schedule_id, updateData);
        showCustomAlert("Cập nhật thành công!", "Đã cập nhật lịch trình", "✅");
        closeEditTaskScheduleModal();
        await loadTaskSchedules();
    } catch (error) {
        console.error("Error updating task schedule:", error);
        showCustomAlert("Lỗi!", error.message, "❌");
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

function closeEditTaskScheduleModal() {
    const modal = document.getElementById("editTaskScheduleModal");
    if (modal) modal.style.display = "none";
    currentEditingTaskSchedule = null;
}

function showConfirmDeleteTaskScheduleModal(scheduleId) {
    pendingDeleteTaskSchedule = { id: scheduleId };
    const modal = document.getElementById("confirmDeleteTaskScheduleModal");
    if (modal) modal.style.display = "flex";
}

function closeConfirmDeleteTaskScheduleModal() {
    const modal = document.getElementById("confirmDeleteTaskScheduleModal");
    if (modal) modal.style.display = "none";
    pendingDeleteTaskSchedule = null;
}

async function executeDeleteTaskSchedule() {
    if (!pendingDeleteTaskSchedule) return;
    
    try {
        await deleteTaskSchedule(pendingDeleteTaskSchedule.id);
        showCustomAlert("Xóa thành công!", "Đã xóa lịch trình", "✅");
        closeConfirmDeleteTaskScheduleModal();
        await loadTaskSchedules();
    } catch (error) {
        showCustomAlert("Lỗi!", error.message, "❌");
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


    const addMilestoneBtn = document.getElementById("addMilestoneBtn");
    if (addMilestoneBtn) addMilestoneBtn.onclick = showAddMilestoneModal;


    const addTaskScheduleBtn = document.getElementById("addTaskScheduleBtn");
    if (addTaskScheduleBtn) addTaskScheduleBtn.onclick = showAddTaskScheduleModal;
    
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
        const milestoneModal = document.getElementById("milestoneModal");
        const editMilestoneModal = document.getElementById("editMilestoneModal");
        const confirmDeleteMilestoneModal = document.getElementById("confirmDeleteMilestoneModal");
        const taskScheduleModal = document.getElementById("taskScheduleModal");
        const editTaskScheduleModal = document.getElementById("editTaskScheduleModal");
        const confirmDeleteTaskScheduleModal = document.getElementById("confirmDeleteTaskScheduleModal");
        
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
        if (e.target === milestoneModal) closeMilestoneModal();
        if (e.target === editMilestoneModal) closeEditMilestoneModal();
        if (e.target === confirmDeleteMilestoneModal) closeConfirmDeleteMilestoneModal();
        if (e.target === taskScheduleModal) closeTaskScheduleModal();
        if (e.target === editTaskScheduleModal) closeEditTaskScheduleModal();
        if (e.target === confirmDeleteTaskScheduleModal) closeConfirmDeleteTaskScheduleModal();
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