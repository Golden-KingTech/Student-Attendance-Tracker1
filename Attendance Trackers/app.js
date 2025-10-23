// ===== Application State =====
let students = [];
let sections = [];
let attendance = [];
let currentLanguage = 'en';
let currentTheme = 'light';
let currentEditStudent = null;
let currentEditSection = null;

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    initializeEventListeners();
    setTodayDate();
    updateUI();
    applyTranslations();
});

// ===== Local Storage Functions =====
function loadFromLocalStorage() {
    students = JSON.parse(localStorage.getItem('students')) || [];
    sections = JSON.parse(localStorage.getItem('sections')) || getDefaultSections();
    attendance = JSON.parse(localStorage.getItem('attendance')) || [];
    currentLanguage = localStorage.getItem('language') || 'en';
    currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply saved theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
    
    // Apply saved language
    document.getElementById('languageSelect').value = currentLanguage;
}

function saveToLocalStorage() {
    localStorage.setItem('students', JSON.stringify(students));
    localStorage.setItem('sections', JSON.stringify(sections));
    localStorage.setItem('attendance', JSON.stringify(attendance));
    localStorage.setItem('language', currentLanguage);
    localStorage.setItem('theme', currentTheme);
}

function getDefaultSections() {
    return [
        { id: generateId(), name: 'Art', color: '#f59e0b' },
        { id: generateId(), name: 'Sports', color: '#10b981' },
        { id: generateId(), name: 'Science', color: '#3b82f6' }
    ];
}

// ===== Helper Functions =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    document.getElementById('reportFromDate').value = today;
    document.getElementById('reportToDate').value = today;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(currentLanguage === 'en' ? 'en-US' : currentLanguage === 'pt' ? 'pt-BR' : 'tr-TR');
}

// ===== Translation Functions =====
function applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });
    
    // Update placeholders
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[currentLanguage][key]) {
            element.placeholder = translations[currentLanguage][key];
        }
    });
}

function translate(key) {
    return translations[currentLanguage][key] || key;
}

// ===== Event Listeners =====
function initializeEventListeners() {
    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Language Switcher
    document.getElementById('languageSelect').addEventListener('change', (e) => {
        currentLanguage = e.target.value;
        saveToLocalStorage();
        applyTranslations();
        updateUI();
    });
    
    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Student Management
    document.getElementById('addStudentBtn').addEventListener('click', () => openStudentModal());
    document.getElementById('studentForm').addEventListener('submit', handleStudentSubmit);
    
    // Section Management
    document.getElementById('addSectionBtn').addEventListener('click', () => openSectionModal());
    document.getElementById('sectionForm').addEventListener('submit', handleSectionSubmit);
    
    // Attendance Filters
    document.getElementById('attendanceDate').addEventListener('change', renderAttendanceTable);
    document.getElementById('sectionFilter').addEventListener('change', renderAttendanceTable);
    document.getElementById('searchStudent').addEventListener('input', renderAttendanceTable);
    
    // Student Search
    document.getElementById('searchStudentList').addEventListener('input', renderStudentsTable);
    
    // Report Filters
    document.getElementById('reportFromDate').addEventListener('change', updateReportPreview);
    document.getElementById('reportToDate').addEventListener('change', updateReportPreview);
    document.getElementById('reportSectionFilter').addEventListener('change', updateReportPreview);
    
    // Export Buttons
    document.getElementById('exportCSVBtn').addEventListener('click', exportToCSV);
    document.getElementById('exportPDFBtn').addEventListener('click', exportToPDF);
    
    // Modal Close Buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

// ===== Theme Functions =====
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
    saveToLocalStorage();
}

function updateThemeIcon() {
    const icon = document.querySelector('#themeToggle i');
    icon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// ===== Tab Navigation =====
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active to clicked button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content based on tab
    if (tabName === 'attendance') {
        renderAttendanceTable();
    } else if (tabName === 'students') {
        renderStudentsTable();
    } else if (tabName === 'sections') {
        renderSectionsGrid();
    } else if (tabName === 'reports') {
        updateReportPreview();
    }
}

// ===== Update UI =====
function updateUI() {
    populateSectionFilters();
    renderAttendanceTable();
    renderStudentsTable();
    renderSectionsGrid();
    updateReportPreview();
}

function populateSectionFilters() {
    const filters = [
        document.getElementById('sectionFilter'),
        document.getElementById('reportSectionFilter')
    ];
    
    filters.forEach(filter => {
        const currentValue = filter.value;
        filter.innerHTML = `<option value="all">${translate('allSections')}</option>`;
        
        sections.forEach(section => {
            const option = document.createElement('option');
            option.value = section.id;
            option.textContent = section.name;
            filter.appendChild(option);
        });
        
        filter.value = currentValue;
    });
}

// ===== Attendance Functions =====
function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    const selectedDate = document.getElementById('attendanceDate').value;
    const selectedSection = document.getElementById('sectionFilter').value;
    const searchTerm = document.getElementById('searchStudent').value.toLowerCase();
    
    tbody.innerHTML = '';
    
    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">${translate('noStudents')}</td></tr>`;
        return;
    }
    
    students.forEach(student => {
        student.sectionIds.forEach(sectionId => {
            const section = sections.find(s => s.id === sectionId);
            if (!section) return;
            
            // Apply filters
            if (selectedSection !== 'all' && sectionId !== selectedSection) return;
            if (searchTerm && !student.name.toLowerCase().includes(searchTerm)) return;
            
            const attendanceRecord = attendance.find(
                a => a.studentId === student.id && a.sectionId === sectionId && a.date === selectedDate
            );
            
            const isPresent = attendanceRecord ? attendanceRecord.present : false;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.name}</td>
                <td><span class="tag" style="background-color: ${section.color}20; color: ${section.color};">${section.name}</span></td>
                <td>
                    <span class="status-badge ${isPresent ? 'status-present' : 'status-absent'}">
                        <i class="fas ${isPresent ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        ${translate(isPresent ? 'present' : 'absent')}
                    </span>
                </td>
                <td>
                    <label class="attendance-toggle">
                        <input type="checkbox" ${isPresent ? 'checked' : ''} 
                               onchange="toggleAttendance('${student.id}', '${sectionId}', '${selectedDate}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    });
}

function toggleAttendance(studentId, sectionId, date, isPresent) {
    const index = attendance.findIndex(
        a => a.studentId === studentId && a.sectionId === sectionId && a.date === date
    );
    
    if (index >= 0) {
        attendance[index].present = isPresent;
    } else {
        attendance.push({
            id: generateId(),
            studentId,
            sectionId,
            date,
            present: isPresent
        });
    }
    
    saveToLocalStorage();
    renderAttendanceTable();
}

// ===== Student Management =====
function renderStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    const searchTerm = document.getElementById('searchStudentList').value.toLowerCase();
    
    tbody.innerHTML = '';
    
    const filteredStudents = students.filter(student => 
        student.name.toLowerCase().includes(searchTerm)
    );
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">${translate('noStudents')}</td></tr>`;
        return;
    }
    
    filteredStudents.forEach(student => {
        const studentSections = student.sectionIds.map(id => {
            const section = sections.find(s => s.id === id);
            return section ? `<span class="tag" style="background-color: ${section.color}20; color: ${section.color};">${section.name}</span>` : '';
        }).join(' ');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.name}</td>
            <td>${studentSections || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="openStudentModal('${student.id}')">
                        <i class="fas fa-edit"></i> ${translate('edit')}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student.id}')">
                        <i class="fas fa-trash"></i> ${translate('delete')}
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function openStudentModal(studentId = null) {
    const modal = document.getElementById('studentModal');
    const form = document.getElementById('studentForm');
    const title = document.getElementById('studentModalTitle');
    const checkboxContainer = document.getElementById('studentSectionsCheckbox');
    
    form.reset();
    checkboxContainer.innerHTML = '';
    
    // Populate sections checkboxes
    sections.forEach(section => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="section_${section.id}" value="${section.id}">
            <label for="section_${section.id}">${section.name}</label>
        `;
        checkboxContainer.appendChild(div);
    });
    
    if (studentId) {
        // Edit mode
        currentEditStudent = students.find(s => s.id === studentId);
        title.textContent = translate('editStudent');
        document.getElementById('studentName').value = currentEditStudent.name;
        
        currentEditStudent.sectionIds.forEach(id => {
            const checkbox = document.getElementById(`section_${id}`);
            if (checkbox) checkbox.checked = true;
        });
    } else {
        // Add mode
        currentEditStudent = null;
        title.textContent = translate('addStudent');
    }
    
    modal.classList.add('active');
}

function handleStudentSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('studentName').value.trim();
    const selectedSections = Array.from(document.querySelectorAll('#studentSectionsCheckbox input:checked'))
        .map(cb => cb.value);
    
    if (!name || selectedSections.length === 0) {
        alert(translate('errorRequired'));
        return;
    }
    
    if (currentEditStudent) {
        // Update existing student
        currentEditStudent.name = name;
        currentEditStudent.sectionIds = selectedSections;
    } else {
        // Add new student
        students.push({
            id: generateId(),
            name,
            sectionIds: selectedSections
        });
    }
    
    saveToLocalStorage();
    closeModals();
    updateUI();
}

function deleteStudent(studentId) {
    if (!confirm(`${translate('confirmDelete')} ${translate('student').toLowerCase()}?`)) return;
    
    students = students.filter(s => s.id !== studentId);
    attendance = attendance.filter(a => a.studentId !== studentId);
    
    saveToLocalStorage();
    updateUI();
}

// ===== Section Management =====
function renderSectionsGrid() {
    const grid = document.getElementById('sectionsGrid');
    grid.innerHTML = '';
    
    if (sections.length === 0) {
        grid.innerHTML = `<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">${translate('noSections')}</p>`;
        return;
    }
    
    sections.forEach(section => {
        const studentCount = students.filter(s => s.sectionIds.includes(section.id)).length;
        
        const card = document.createElement('div');
        card.className = 'section-card';
        card.style.borderLeftColor = section.color;
        card.innerHTML = `
            <h3>${section.name}</h3>
            <p>${studentCount} ${translate('studentsCount')}</p>
            <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="openSectionModal('${section.id}')">
                    <i class="fas fa-edit"></i> ${translate('edit')}
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSection('${section.id}')">
                    <i class="fas fa-trash"></i> ${translate('delete')}
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function openSectionModal(sectionId = null) {
    const modal = document.getElementById('sectionModal');
    const form = document.getElementById('sectionForm');
    const title = document.getElementById('sectionModalTitle');
    
    form.reset();
    
    if (sectionId) {
        // Edit mode
        currentEditSection = sections.find(s => s.id === sectionId);
        title.textContent = translate('editSection');
        document.getElementById('sectionName').value = currentEditSection.name;
        document.getElementById('sectionColor').value = currentEditSection.color;
    } else {
        // Add mode
        currentEditSection = null;
        title.textContent = translate('addSection');
        document.getElementById('sectionColor').value = '#3b82f6';
    }
    
    modal.classList.add('active');
}

function handleSectionSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('sectionName').value.trim();
    const color = document.getElementById('sectionColor').value;
    
    if (!name) {
        alert(translate('errorRequired'));
        return;
    }
    
    if (currentEditSection) {
        // Update existing section
        currentEditSection.name = name;
        currentEditSection.color = color;
    } else {
        // Add new section
        sections.push({
            id: generateId(),
            name,
            color
        });
    }
    
    saveToLocalStorage();
    closeModals();
    updateUI();
}

function deleteSection(sectionId) {
    if (!confirm(`${translate('confirmDelete')} ${translate('section').toLowerCase()}?`)) return;
    
    sections = sections.filter(s => s.id !== sectionId);
    
    // Remove section from students
    students.forEach(student => {
        student.sectionIds = student.sectionIds.filter(id => id !== sectionId);
    });
    
    // Remove attendance records
    attendance = attendance.filter(a => a.sectionId !== sectionId);
    
    saveToLocalStorage();
    updateUI();
}

// ===== Modal Functions =====
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    currentEditStudent = null;
    currentEditSection = null;
}

// ===== Report Functions =====
function updateReportPreview() {
    const fromDate = document.getElementById('reportFromDate').value;
    const toDate = document.getElementById('reportToDate').value;
    const sectionFilter = document.getElementById('reportSectionFilter').value;
    
    const filteredAttendance = getFilteredAttendance(fromDate, toDate, sectionFilter);
    
    // Calculate statistics
    const totalRecords = filteredAttendance.length;
    const presentCount = filteredAttendance.filter(a => a.present).length;
    const absentCount = totalRecords - presentCount;
    const rate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;
    
    document.getElementById('totalStudents').textContent = new Set(filteredAttendance.map(a => a.studentId)).size;
    document.getElementById('totalPresent').textContent = presentCount;
    document.getElementById('totalAbsent').textContent = absentCount;
    document.getElementById('attendanceRate').textContent = rate + '%';
    
    // Render table
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';
    
    if (filteredAttendance.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">${translate('noAttendance')}</td></tr>`;
        return;
    }
    
    filteredAttendance.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(record => {
        const student = students.find(s => s.id === record.studentId);
        const section = sections.find(s => s.id === record.sectionId);
        
        if (!student || !section) return;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(record.date)}</td>
            <td>${student.name}</td>
            <td><span class="tag" style="background-color: ${section.color}20; color: ${section.color};">${section.name}</span></td>
            <td>
                <span class="status-badge ${record.present ? 'status-present' : 'status-absent'}">
                    <i class="fas ${record.present ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    ${translate(record.present ? 'present' : 'absent')}
                </span>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function getFilteredAttendance(fromDate, toDate, sectionFilter) {
    return attendance.filter(record => {
        const dateMatch = (!fromDate || record.date >= fromDate) && (!toDate || record.date <= toDate);
        const sectionMatch = sectionFilter === 'all' || record.sectionId === sectionFilter;
        return dateMatch && sectionMatch;
    });
}

// ===== Export Functions =====
function exportToCSV() {
    const fromDate = document.getElementById('reportFromDate').value;
    const toDate = document.getElementById('reportToDate').value;
    const sectionFilter = document.getElementById('reportSectionFilter').value;
    
    const filteredAttendance = getFilteredAttendance(fromDate, toDate, sectionFilter);
    
    if (filteredAttendance.length === 0) {
        alert(translate('noAttendance'));
        return;
    }
    
    // Create CSV content
    let csv = `${translate('attendanceReport')}\n`;
    csv += `${translate('generatedOn')}: ${formatDate(new Date().toISOString().split('T')[0])}\n\n`;
    csv += `${translate('date')},${translate('student')},${translate('section')},${translate('status')}\n`;
    
    filteredAttendance.forEach(record => {
        const student = students.find(s => s.id === record.studentId);
        const section = sections.find(s => s.id === record.sectionId);
        
        if (student && section) {
            csv += `${formatDate(record.date)},${student.name},${section.name},${translate(record.present ? 'present' : 'absent')}\n`;
        }
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function exportToPDF() {
    const fromDate = document.getElementById('reportFromDate').value;
    const toDate = document.getElementById('reportToDate').value;
    const sectionFilter = document.getElementById('reportSectionFilter').value;
    
    const filteredAttendance = getFilteredAttendance(fromDate, toDate, sectionFilter);
    
    if (filteredAttendance.length === 0) {
        alert(translate('noAttendance'));
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(translate('attendanceReport'), 14, 20);
    
    // Generated date
    doc.setFontSize(10);
    doc.text(`${translate('generatedOn')}: ${formatDate(new Date().toISOString().split('T')[0])}`, 14, 28);
    
    // Statistics
    const totalRecords = filteredAttendance.length;
    const presentCount = filteredAttendance.filter(a => a.present).length;
    const absentCount = totalRecords - presentCount;
    const rate = ((presentCount / totalRecords) * 100).toFixed(1);
    
    doc.text(`${translate('totalPresent')}: ${presentCount} | ${translate('totalAbsent')}: ${absentCount} | ${translate('attendanceRate')}: ${rate}%`, 14, 35);
    
    // Table
    const tableData = filteredAttendance.map(record => {
        const student = students.find(s => s.id === record.studentId);
        const section = sections.find(s => s.id === record.sectionId);
        
        return [
            formatDate(record.date),
            student ? student.name : '-',
            section ? section.name : '-',
            translate(record.present ? 'present' : 'absent')
        ];
    });
    
    doc.autoTable({
        startY: 42,
        head: [[translate('date'), translate('student'), translate('section'), translate('status')]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
}
