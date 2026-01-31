let activeSessions = JSON.parse(localStorage.getItem("activeSessions")) || [];
let currentUser = null;
let users = [];
let capturedPhoto = null;


const video = document.getElementById("video");
video.width = 400;
video.height = 300;

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => { video.srcObject = stream; })
  .catch(err => { alert("Could not access webcam: " + err); });


function capturePhoto() {
  const canvas = document.getElementById("canvas");
  canvas.width = video.width;
  canvas.height = video.height;
  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  capturedPhoto = canvas.toDataURL("image/png");
  alert("Photo captured successfully!");
}


function registerUser() {
  const name = document.getElementById("regName").value.trim();
  const course = document.getElementById("regCourse").value;
  const section = document.getElementById("regSection").value;

  if (!name) { alert("Please enter your name!"); return; }
  if (!course) { alert("Please select a course!"); return; }
  if (!section) { alert("Please select a section!"); return; }
  if (!capturedPhoto) { alert("Please capture a photo before registering!"); return; }

  const id = users.length + 1;
  users.push({ id, name, course, section, photo: capturedPhoto });

  const dropdown = document.getElementById("userDropdown");
  const option = document.createElement("option");
  option.value = id;
  option.textContent = name;
  dropdown.appendChild(option);

  alert(`${name} registered successfully!`);
  document.getElementById("regName").value = "";
  document.getElementById("regCourse").value = "";
  document.getElementById("regSection").value = "";
  capturedPhoto = null;

  showSection("login");
}


function showSection(section) {
  const sections = ['registerSection', 'loginSection', 'historySection'];
  sections.forEach(sec => document.getElementById(sec).style.display = 'none');
  document.getElementById(section + 'Section').style.display = 'flex';

  if (section === 'login') {
    document.getElementById("userSection").style.display = "none";
    document.getElementById("borrowSection").style.display = "none";
    document.getElementById("returnSection").style.display = "none";

    document.getElementById("userDropdown").style.display = "block";
    document.getElementById("loginSection").querySelector("button").style.display = "inline-block";
  }

  if (section === 'history') {
    updateHistoryView();
  }
}


function loginExistingUser() {
  const userId = document.getElementById("userDropdown").value;
  if (!userId) { alert("Please select a user!"); return; }
  simulateScan(parseInt(userId));
}

function simulateScan(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;

  currentUser = { ...user, timestamp: new Date().toISOString() };

  document.getElementById("userDropdown").style.display = "none";
  document.getElementById("loginSection").querySelector("button").style.display = "none";

  showKeySelection();
}


function showKeySelection() {
  const active = activeSessions.find(s => s.userId === currentUser.id && s.status === "Borrowed");

  document.getElementById("userSection").style.display = "block";
  document.getElementById("userDetails").innerHTML =
    `<img src="${currentUser.photo}" alt="user" style="width:80px;height:80px;border-radius:50%;">
     <p><b>${currentUser.name}</b><br>${currentUser.course} - ${currentUser.section}</p>`;

  if (active) {
    document.getElementById("borrowSection").style.display = "none";
    document.getElementById("returnSection").style.display = "block";
    document.getElementById("returnSection").innerHTML =
      `<p>You currently have <b>${active.key}</b>.</p>
       <button onclick="returnKey('${active.key}')">Return Key</button>
       <br><br>
       <button onclick="logout()">Logout</button>`;
  } else {
    const allKeys = ["Key-101", "Key-102", "Key-103"];
    const borrowedKeys = activeSessions
      .filter(s => s.status === "Borrowed")
      .map(s => s.key);
    const availableKeys = allKeys.filter(k => !borrowedKeys.includes(k));

    if (availableKeys.length === 0) {
      document.getElementById("borrowSection").innerHTML =
        `<p>All keys are currently borrowed.</p>
         <button onclick="logout()">Logout</button>`;
    } else {
      document.getElementById("borrowSection").innerHTML =
        `<label for="keySelect">Choose Key:</label>
         <select id="keySelect">
           ${availableKeys.map(k => `<option value="${k}">${k}</option>`).join("")}
         </select>
         <button onclick="borrowKey()">Borrow Key</button>
         <br><br>
         <button onclick="logout()">Logout</button>`;
    }

    document.getElementById("borrowSection").style.display = "block";
    document.getElementById("returnSection").style.display = "none";
  }
}

function borrowKey() {
  const existingBorrow = activeSessions.find(
    s => s.userId === currentUser.id && s.status === "Borrowed"
  );

  if (existingBorrow) {
    alert(`You already borrowed ${existingBorrow.key}. Please return it first.`);
    return;
  }

  const key = document.getElementById("keySelect").value;
  const alreadyBorrowed = activeSessions.find(s => s.key === key && s.status === "Borrowed");

  if (alreadyBorrowed) {
    alert(`Sorry! ${key} is already borrowed by another user.`);
    return;
  }

  const date = new Date();
  activeSessions.push({
    userId: currentUser.id,
    name: currentUser.name,
    course: currentUser.course,
    section: currentUser.section,
    photo: currentUser.photo,
    timeIn: date.toLocaleTimeString(),
    timeOut: "---",
    date: date.toLocaleDateString(),
    key,
    status: "Borrowed"
  });

  saveToStorage();
  showKeySelection();
}

function returnKey(key) {
  const active = activeSessions.find(s => s.userId === currentUser.id && s.status === "Borrowed" && s.key === key);
  if (active) {
    active.timeOut = new Date().toLocaleTimeString();
    active.status = "Returned";
  }
  saveToStorage();
  showKeySelection();
}


function saveToStorage() {
  localStorage.setItem("activeSessions", JSON.stringify(activeSessions));
  updateHistoryView();
}


function updateHistoryView() {
  const container = document.getElementById("historyContainer");
  container.innerHTML = "";


  const grouped = {};
  activeSessions.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  });

  for (const date in grouped) {
    const dayBlock = document.createElement("div");
    dayBlock.innerHTML = `<h2>${date}</h2>`;
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>User</th>
          <th>Course</th>
          <th>Program</th>
          <th>Time In</th>
          <th>Time Out</th>
          <th>Key</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${grouped[date].map(session => `
          <tr>
            <td><img src="${session.photo}" style="width:40px;height:40px;border-radius:50%;"><br>${session.name}</td>
            <td>${session.course}</td>
            <td>${session.section}</td>
            <td>${session.timeIn}</td>
            <td>${session.timeOut}</td>
            <td>${session.key}</td>
            <td class="${session.status === "Borrowed" ? "status-borrowed" : "status-returned"}">${session.status}</td>
          </tr>
        `).join("")}
      </tbody>`;
    dayBlock.appendChild(table);
    container.appendChild(dayBlock);
  }
}


function logout() {
  currentUser = null;
  showSection('login');
  document.getElementById("userSection").style.display = "none";

  document.getElementById("userDropdown").style.display = "block";
  document.getElementById("loginSection").querySelector("button").style.display = "inline-block";
}
