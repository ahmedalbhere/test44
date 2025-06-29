// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  set, 
  push, 
  onValue, 
  remove, 
  update, 
  get,
  off
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJ4VhGD49H3RNifMf9VCRPnkALAxNpsOU",
  authDomain: "project-2980864980936907935.firebaseapp.com",
  databaseURL: "https://project-2980864980936907935-default-rtdb.firebaseio.com",
  projectId: "project-2980864980936907935",
  storageBucket: "project-2980864980936907935.appspot.com",
  messagingSenderId: "580110751353",
  appId: "1:580110751353:web:8f039f9b34e1709d4126a8",
  measurementId: "G-R3JNPHCFZG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// State management
const state = {
  currentUser: null,
  currentUserType: null,
  barbers: {},
  queueListeners: {},
  barbersListener: null,
  currentRating: null
};

// DOM elements
const elements = {
  screens: {
    roleSelection: document.getElementById('roleSelection'),
    clientLogin: document.getElementById('clientLogin'),
    barberLogin: document.getElementById('barberLogin'),
    clientDashboard: document.getElementById('clientDashboard'),
    barberDashboard: document.getElementById('barberDashboard')
  },
  client: {
    name: document.getElementById('clientName'),
    phone: document.getElementById('clientPhone'),
    error: document.getElementById('clientError'),
    avatar: document.getElementById('clientAvatar'),
    bookingContainer: document.getElementById('currentBookingContainer'),
    bookingBarber: document.getElementById('bookingBarber'),
    bookingPosition: document.getElementById('bookingPosition'),
    bookingTime: document.getElementById('bookingTime'),
    cancelBookingBtn: document.getElementById('cancelBookingBtn'),
    barbersList: document.getElementById('barbersList'),
    citySearch: document.getElementById('citySearch')
  },
  barber: {
    phone: document.getElementById('barberPhone'),
    password: document.getElementById('barberPassword'),
    name: document.getElementById('barberName'),
    newPhone: document.getElementById('newBarberPhone'),
    city: document.getElementById('barberCity'),
    location: document.getElementById('barberLocation'),
    newPassword: document.getElementById('newBarberPassword'),
    confirmPassword: document.getElementById('confirmBarberPassword'),
    error: document.getElementById('barberError'),
    avatar: document.getElementById('barberAvatar'),
    queue: document.getElementById('barberQueue'),
    statusToggle: document.getElementById('statusToggle'),
    statusText: document.getElementById('statusText'),
    formTitle: document.getElementById('barberFormTitle'),
    loginForm: document.getElementById('barberLoginForm'),
    signupForm: document.getElementById('barberSignupForm')
  },
  rating: {
    container: document.getElementById('ratingContainer'),
    stars: document.querySelectorAll('.stars i'),
    comment: document.getElementById('ratingComment')
  }
};

// Utility functions
const utils = {
  generateId: () => 'id-' + Math.random().toString(36).substr(2, 9),
  
  showError: (element, message) => {
    element.textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => element.classList.add('hidden'), 5000);
  },
  
  validatePhone: (phone) => /^[0-9]{10,15}$/.test(phone),
  
  clearForm: (formElements) => {
    Object.values(formElements).forEach(element => {
      if (element && element.value) element.value = '';
    });
  },
  
  debounce: (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  },
  
  adjustLayoutForMobile: () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    const roleSelection = document.getElementById('roleSelection');
    const loginContainers = document.querySelectorAll('.login-container');
    const dashboards = document.querySelectorAll('.dashboard');
    
    if (roleSelection) {
      roleSelection.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
    }
    
    loginContainers.forEach(container => {
      container.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
    });
    
    dashboards.forEach(dashboard => {
      dashboard.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
    });
  }
};

// Screen management
function showScreen(screenId) {
  Object.values(elements.screens).forEach(screen => {
    screen.classList.add('hidden');
  });
  elements.screens[screenId].classList.remove('hidden');
  
  window.scrollTo(0, 0);
  utils.adjustLayoutForMobile();
}

// Barber form management
function showBarberSignup() {
  elements.barber.formTitle.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء حساب حلاق جديد';
  elements.barber.loginForm.classList.add('hidden');
  elements.barber.signupForm.classList.remove('hidden');
}

function showBarberLogin() {
  elements.barber.formTitle.innerHTML = '<i class="fas fa-cut"></i> تسجيل الدخول للحلاقين';
  elements.barber.signupForm.classList.add('hidden');
  elements.barber.loginForm.classList.remove('hidden');
}

// Authentication functions
async function clientLogin() {
  const name = elements.client.name.value.trim();
  const phone = elements.client.phone.value.trim();
  const rememberMe = document.getElementById('rememberMeClient').checked;
  
  if (!name) {
    utils.showError(elements.client.error, 'الرجاء إدخال الاسم');
    return;
  }
  
  if (!phone || !utils.validatePhone(phone)) {
    utils.showError(elements.client.error, 'الرجاء إدخال رقم هاتف صحيح (10-15 رقمًا)');
    return;
  }
  
  try {
    // تحميل معرف العميل من localStorage إذا كان موجوداً
    const savedData = JSON.parse(localStorage.getItem('client_data')) || {};
    const clientId = savedData.clientId || utils.generateId();
    
    state.currentUser = {
      id: clientId,
      name,
      phone,
      type: 'client'
    };
    state.currentUserType = 'client';
    
    elements.client.avatar.textContent = name.charAt(0);
    showClientDashboard();
    await loadBarbers();
    
    // تحميل أي حجز موجود لهذا العميل
    await checkExistingBooking();
    
    // حفظ بيانات العميل في localStorage
    if (rememberMe) {
      localStorage.setItem('client_data', JSON.stringify({ 
        name, 
        phone, 
        remember: true,
        clientId: state.currentUser.id,
        booking: state.currentUser.booking
      }));
    } else {
      localStorage.removeItem('client_data');
    }
  } catch (error) {
    utils.showError(elements.client.error, 'حدث خطأ أثناء تسجيل الدخول');
    console.error('Client login error:', error);
  }
}

async function barberSignup() {
  const { name, newPhone, city, location, newPassword, confirmPassword, error } = elements.barber;
  
  if (!name.value || !newPhone.value || !city.value || !location.value || !newPassword.value || !confirmPassword.value) {
    utils.showError(error, 'جميع الحقول مطلوبة');
    return;
  }
  
  if (!utils.validatePhone(newPhone.value)) {
    utils.showError(error, 'رقم الهاتف يجب أن يكون بين 10-15 رقمًا');
    return;
  }
  
  if (newPassword.value.length < 6) {
    utils.showError(error, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    return;
  }
  
  if (newPassword.value !== confirmPassword.value) {
    utils.showError(error, 'كلمتا المرور غير متطابقتين');
    return;
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      `${newPhone.value}@barber.com`, 
      newPassword.value
    );
    
    await set(ref(database, 'barbers/' + userCredential.user.uid), {
      name: name.value,
      phone: newPhone.value,
      city: city.value,
      location: location.value,
      status: 'open',
      queue: {},
      averageRating: 0,
      ratingCount: 0
    });
    
    state.currentUser = {
      id: userCredential.user.uid,
      name: name.value,
      phone: newPhone.value,
      city: city.value,
      location: location.value,
      type: 'barber'
    };
    
    elements.barber.avatar.textContent = name.value.charAt(0);
    showBarberDashboard();
    loadBarberQueue();
    
    utils.clearForm({
      name: name,
      newPhone: newPhone,
      city: city,
      location: location,
      newPassword: newPassword,
      confirmPassword: confirmPassword
    });
    
  } catch (error) {
    let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'هذا الرقم مسجل بالفعل، يرجى تسجيل الدخول';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'رقم الهاتف غير صالح';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'كلمة المرور ضعيفة جداً';
    }
    
    utils.showError(elements.barber.error, errorMessage);
    console.error('Barber signup error:', error);
  }
}

async function barberLogin() {
  const { phone, password, error } = elements.barber;
  const rememberMe = document.getElementById('rememberMeBarber').checked;
  
  if (!phone.value || !password.value) {
    utils.showError(error, 'رقم الهاتف وكلمة المرور مطلوبان');
    return;
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      `${phone.value}@barber.com`,
      password.value
    );
    
    if (rememberMe) {
      localStorage.setItem('barber_login', JSON.stringify({
        phone: phone.value,
        password: password.value,
        remember: true
      }));
    } else {
      localStorage.removeItem('barber_login');
    }
    
    const barberRef = ref(database, 'barbers/' + userCredential.user.uid);
    const snapshot = await get(barberRef);
    
    if (snapshot.exists()) {
      const barberData = snapshot.val();
      
      state.currentUser = {
        id: userCredential.user.uid,
        name: barberData.name,
        phone: barberData.phone,
        city: barberData.city,
        location: barberData.location,
        type: 'barber'
      };
      
      elements.barber.avatar.textContent = barberData.name.charAt(0);
      showBarberDashboard();
      loadBarberQueue();
      
      utils.clearForm({
        phone: phone,
        password: password
      });
    } else {
      utils.showError(error, 'بيانات الحلاق غير موجودة');
      await signOut(auth);
    }
    
  } catch (error) {
    let errorMessage = 'بيانات الدخول غير صحيحة';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'لا يوجد حساب مرتبط بهذا الرقم';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'كلمة المرور غير صحيحة';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'تم تجاوز عدد المحاولات المسموح بها، يرجى المحاولة لاحقاً';
    }
    
    utils.showError(elements.barber.error, errorMessage);
    console.error('Barber login error:', error);
  }
}

// Dashboard functions
function showClientDashboard() {
  showScreen('clientDashboard');
}

function showBarberDashboard() {
  showScreen('barberDashboard');
  
  onValue(ref(database, 'barbers/' + state.currentUser.id + '/status'), (snapshot) => {
    const status = snapshot.val() || 'open';
    elements.barber.statusToggle.checked = status === 'open';
    elements.barber.statusText.textContent = status === 'open' ? 'مفتوح' : 'مغلق';
  });
  
  elements.barber.statusToggle.addEventListener('change', function() {
    const newStatus = this.checked ? 'open' : 'closed';
    update(ref(database, 'barbers/' + state.currentUser.id), { status: newStatus });
  });
}

// Barber management
async function loadBarbers() {
  elements.client.barbersList.innerHTML = '<div class="loading">جارٍ تحميل قائمة الحلاقين...</div>';
  
  if (state.barbersListener) {
    off(state.barbersListener);
  }
  
  state.barbersListener = onValue(ref(database, 'barbers'), (snapshot) => {
    state.barbers = snapshot.val() || {};
    renderBarbersList();
  }, (error) => {
    elements.client.barbersList.innerHTML = '<div class="error">حدث خطأ أثناء تحميل الحلاقين</div>';
    console.error('Load barbers error:', error);
  });
}

function renderBarbersList() {
  if (!elements.client.barbersList) return;
  
  elements.client.barbersList.innerHTML = '';
  
  if (!state.barbers || Object.keys(state.barbers).length === 0) {
    elements.client.barbersList.innerHTML = '<div class="no-results">لا يوجد حلاقون مسجلون حالياً</div>';
    return;
  }
  
  const sortedBarbers = Object.entries(state.barbers)
    .sort(([, a], [, b]) => (b.averageRating || 0) - (a.averageRating || 0));
  
  sortedBarbers.forEach(([id, barber], index) => {
    const isTopRated = index < 3 && barber.averageRating >= 4;
    const hasBooking = state.currentUser?.booking;
    const isCurrentBarber = state.currentUser?.booking?.barberId === id;
    
    const barberCard = document.createElement('div');
    barberCard.className = `barber-card ${isTopRated ? 'top-rated' : ''}`;
    
    const statusClass = barber.status === 'open' ? 'status-open' : 'status-closed';
    const statusText = barber.status === 'open' ? 'مفتوح' : 'مغلق';
    const queueLength = barber.queue ? Object.keys(barber.queue).length : 0;
    
    const ratingStars = barber.averageRating ? 
      `<div class="barber-rating">
        ${'<i class="fas fa-star"></i>'.repeat(Math.round(barber.averageRating))}
        <span class="barber-rating-count">(${barber.ratingCount || 0})</span>
      </div>` : '';
    
    barberCard.innerHTML = `
      <div class="barber-info">
        <div class="barber-header">
          <div class="barber-avatar">${barber.name.charAt(0)}</div>
          <div class="barber-name">${barber.name}</div>
        </div>
        <div class="barber-status ${statusClass}">${statusText}</div>
        ${ratingStars}
        <div class="barber-details">
          <div><i class="fas fa-city"></i> المدينة: <span class="city-name">${barber.city || 'غير متوفر'}</span></div>
          <div><i class="fas fa-phone"></i> رقم الهاتف: ${barber.phone || 'غير متوفر'}</div>
          <div><i class="fas fa-map-marker-alt"></i> الموقع: <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barber.location)}" target="_blank" class="location-link">${barber.location || 'غير متوفر'}</a></div>
          <div><i class="fas fa-users"></i> عدد المنتظرين: ${queueLength}</div>
          <div><i class="fas fa-clock"></i> وقت الانتظار التقريبي: ${queueLength * 15} دقيقة</div>
        </div>
      </div>
      <button class="book-btn" ${barber.status === 'closed' || (hasBooking && !isCurrentBarber) ? 'disabled' : ''}" 
              onclick="bookAppointment('${id}', '${barber.name.replace(/'/g, "\\'")}')">
        ${hasBooking ? 
          (isCurrentBarber ? '<i class="fas fa-calendar-check"></i> لديك حجز هنا' : '<i class="fas fa-calendar-check"></i> لديك حجز بالفعل') : 
          (barber.status === 'open' ? '<i class="fas fa-calendar-plus"></i> احجز الآن' : '<i class="fas fa-calendar-times"></i> غير متاح')}
      </button>
    `;
    
    elements.client.barbersList.appendChild(barberCard);
  });
}

// Booking management
async function bookAppointment(barberId, barberName) {
  if (!state.currentUser) return;
  
  // التحقق من وجود حجز سابق عند حلاق آخر
  if (state.currentUser.booking && state.currentUser.booking.barberId !== barberId) {
    alert('لديك حجز بالفعل عند حلاق آخر، يرجى إلغاء الحجز الحالي أولاً');
    return;
  }
  
  try {
    const newBookingRef = push(ref(database, `barbers/${barberId}/queue`));
    await set(newBookingRef, {
      clientId: state.currentUser.id,
      clientName: state.currentUser.name,
      clientPhone: state.currentUser.phone,
      timestamp: Date.now()
    });
    
    // حفظ بيانات الحجز
    const bookingData = {
      barberId,
      barberName,
      bookingId: newBookingRef.key,
      timestamp: new Date().toLocaleString('ar-EG')
    };
    
    state.currentUser.booking = bookingData;
    
    // حفظ الحجز في localStorage
    const savedData = JSON.parse(localStorage.getItem('client_data')) || {};
    savedData.booking = bookingData;
    localStorage.setItem('client_data', JSON.stringify(savedData));
    
    showCurrentBooking();
    renderBarbersList();
    
    alert(`تم الحجز بنجاح مع الحلاق ${barberName}`);
  } catch (error) {
    alert('حدث خطأ أثناء الحجز: ' + error.message);
    console.error('Booking error:', error);
  }
}

async function checkExistingBooking() {
  if (!state.currentUser || state.currentUser.type !== 'client') return;
  
  // تحميل الحجز من localStorage إذا كان موجوداً
  const savedData = JSON.parse(localStorage.getItem('client_data')) || {};
  if (savedData.booking) {
    state.currentUser.booking = savedData.booking;
    showCurrentBooking();
    return;
  }
  
  // البحث في قاعدة البيانات عن حجز للعميل
  for (const [barberId, barber] of Object.entries(state.barbers)) {
    if (barber.queue) {
      for (const [bookingId, booking] of Object.entries(barber.queue)) {
        if (booking.clientId === state.currentUser.id) {
          const bookingData = {
            barberId,
            barberName: barber.name,
            bookingId,
            timestamp: new Date(booking.timestamp).toLocaleString('ar-EG')
          };
          
          state.currentUser.booking = bookingData;
          
          // حفظ الحجز في localStorage
          const savedData = JSON.parse(localStorage.getItem('client_data')) || {};
          savedData.booking = bookingData;
          localStorage.setItem('client_data', JSON.stringify(savedData));
          
          showCurrentBooking();
          return;
        }
      }
    }
  }
}

function showCurrentBooking() {
  if (!state.currentUser?.booking) return;
  
  const { booking } = state.currentUser;
  elements.client.bookingBarber.textContent = booking.barberName;
  elements.client.bookingTime.textContent = booking.timestamp;
  
  if (state.queueListeners[booking.barberId]) {
    off(state.queueListeners[booking.barberId]);
  }
  
  state.queueListeners[booking.barberId] = onValue(
    ref(database, `barbers/${booking.barberId}/queue`), 
    (snapshot) => {
      const queue = snapshot.val() || {};
      const queueArray = Object.entries(queue).map(([key, value]) => ({
        id: key,
        ...value
      })).sort((a, b) => a.timestamp - b.timestamp);
      
      const position = queueArray.findIndex(item => item.id === booking.bookingId) + 1;
      elements.client.bookingPosition.textContent = position > 0 ? position : '--';
    },
    (error) => {
      console.error('Queue listener error:', error);
    }
  );
  
  elements.client.bookingContainer.classList.remove('hidden');
  
  // Add event listener to cancel button
  elements.client.cancelBookingBtn.onclick = cancelBooking;
}

async function cancelBooking() {
  if (!state.currentUser?.booking) return;
  
  const { barberId, bookingId } = state.currentUser.booking;
  
  if (!confirm('هل أنت متأكد من إلغاء الحجز؟')) return;
  
  try {
    await remove(ref(database, `barbers/${barberId}/queue/${bookingId}`));
    
    // حذف الحجز من state و localStorage
    delete state.currentUser.booking;
    const savedData = JSON.parse(localStorage.getItem('client_data')) || {};
    delete savedData.booking;
    localStorage.setItem('client_data', JSON.stringify(savedData));
    
    elements.client.bookingContainer.classList.add('hidden');
    renderBarbersList();
    
    alert('تم إلغاء الحجز بنجاح');
  } catch (error) {
    alert('حدث خطأ أثناء إلغاء الحجز: ' + error.message);
    console.error('Cancel booking error:', error);
  }
}

// Rating system
function setupRatingStars() {
  elements.rating.stars.forEach(star => {
    star.addEventListener('click', function() {
      const rating = parseInt(this.getAttribute('data-rating'));
      elements.rating.stars.forEach((s, i) => {
        if (i < rating) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
      state.currentRating = rating;
    });
  });
}

async function submitRating() {
  if (!state.currentRating || !state.currentUser?.booking) return;
  
  try {
    const ratingData = {
      barberId: state.currentUser.booking.barberId,
      clientId: state.currentUser.id,
      clientName: state.currentUser.name,
      rating: state.currentRating,
      comment: elements.rating.comment.value.trim(),
      timestamp: Date.now()
    };
    
    await push(ref(database, `ratings/${state.currentUser.booking.barberId}`), ratingData);
    await updateBarberRating(state.currentUser.booking.barberId);
    
    elements.rating.container.classList.add('hidden');
    alert('شكراً لتقييمك!');
    
    elements.rating.stars.forEach(star => star.classList.remove('active'));
    elements.rating.comment.value = '';
    state.currentRating = null;
    
  } catch (error) {
    console.error('Rating submission error:', error);
    alert('حدث خطأ أثناء إرسال التقييم');
  }
}

async function updateBarberRating(barberId) {
  const ratingsRef = ref(database, `ratings/${barberId}`);
  const snapshot = await get(ratingsRef);
  
  if (!snapshot.exists()) return;
  
  const ratings = snapshot.val();
  const ratingsArray = Object.values(ratings);
  const totalRatings = ratingsArray.length;
  const sumRatings = ratingsArray.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = sumRatings / totalRatings;
  
  await update(ref(database, `barbers/${barberId}`), {
    averageRating: averageRating.toFixed(1),
    ratingCount: totalRatings
  });
}

function showRatingForm() {
  elements.rating.container.classList.remove('hidden');
}

// Queue management
async function loadBarberQueue() {
  if (!state.currentUser || state.currentUser.type !== 'barber') return;
  
  elements.barber.queue.innerHTML = '<li class="loading">جارٍ تحميل قائمة الانتظار...</li>';
  
  const queueRef = ref(database, `barbers/${state.currentUser.id}/queue`);
  
  if (state.queueListeners[state.currentUser.id]) {
    off(state.queueListeners[state.currentUser.id]);
  }
  
  state.queueListeners[state.currentUser.id] = onValue(queueRef, (snapshot) => {
    const queue = snapshot.val() || {};
    elements.barber.queue.innerHTML = '';
    
    if (Object.keys(queue).length === 0) {
      elements.barber.queue.innerHTML = '<li class="no-clients">لا يوجد عملاء في قائمة الانتظار</li>';
      return;
    }
    
    const queueArray = Object.entries(queue).map(([key, value]) => ({
      id: key,
      ...value
    })).sort((a, b) => a.timestamp - b.timestamp);
    
    queueArray.forEach((booking, index) => {
      const queueItem = document.createElement('li');
      queueItem.className = 'queue-item';
      
      queueItem.innerHTML = `
        <div class="queue-info">
          <div class="queue-position">الرقم ${index + 1}</div>
          <div class="queue-name">${booking.clientName}</div>
          <div class="queue-phone">${booking.clientPhone || 'غير متوفر'}</div>
          <div class="queue-time">${new Date(booking.timestamp).toLocaleString('ar-EG')}</div>
        </div>
        ${index === 0 ? `
          <button class="delete-btn" onclick="completeClient('${state.currentUser.id}', '${booking.id}')">
            <i class="fas fa-check"></i>
          </button>
        ` : ''}
      `;
      
      elements.barber.queue.appendChild(queueItem);
    });
  }, (error) => {
    elements.barber.queue.innerHTML = '<li class="error">حدث خطأ أثناء تحميل قائمة الانتظار</li>';
    console.error('Load queue error:', error);
  });
}

async function completeClient(barberId, bookingId) {
  if (!confirm('هل أنتهيت من خدمة هذا العميل؟')) return;
  
  try {
    const bookingRef = ref(database, `barbers/${barberId}/queue/${bookingId}`);
    const snapshot = await get(bookingRef);
    
    await remove(bookingRef);
    
    if (state.currentUser?.booking?.bookingId === bookingId) {
      showRatingForm();
    }
    
    alert('تم إنهاء خدمة العميل بنجاح');
  } catch (error) {
    alert('حدث خطأ أثناء إنهاء الخدمة: ' + error.message);
    console.error('Complete client error:', error);
  }
}

// Search functionality
function filterBarbers() {
  const searchTerm = elements.client.citySearch.value.trim().toLowerCase();
  const barberCards = document.querySelectorAll('.barber-card');
  
  if (!searchTerm) {
    barberCards.forEach(card => card.style.display = 'flex');
    return;
  }
  
  let hasResults = false;
  
  barberCards.forEach(card => {
    const cityElement = card.querySelector('.city-name');
    const nameElement = card.querySelector('.barber-name');
    const locationElement = card.querySelector('.location-link');
    
    if (cityElement && nameElement && locationElement) {
      const city = cityElement.textContent.toLowerCase();
      const name = nameElement.textContent.toLowerCase();
      const location = locationElement.textContent.toLowerCase();
      
      if (city.includes(searchTerm) || name.includes(searchTerm) || location.includes(searchTerm)) {
        card.style.display = 'flex';
        hasResults = true;
        
        if (city.includes(searchTerm)) {
          cityElement.innerHTML = city.replace(
            new RegExp(searchTerm, 'gi'), 
            match => `<span class="highlight">${match}</span>`
          );
        }
      } else {
        card.style.display = 'none';
      }
    }
  });
  
  if (!hasResults) {
    elements.client.barbersList.innerHTML = '<div class="no-results">لا توجد نتائج مطابقة للبحث</div>';
  }
}

// Logout function
async function logout() {
  try {
    Object.values(state.queueListeners).forEach(off);
    if (state.barbersListener) off(state.barbersListener);
    
    // حفظ بيانات الحجز قبل الخروج إذا كان هناك حجز
    if (state.currentUser?.booking) {
      const savedData = JSON.parse(localStorage.getItem('client_data')) || {};
      savedData.booking = state.currentUser.booking;
      localStorage.setItem('client_data', JSON.stringify(savedData));
    }
    
    await signOut(auth);
    state.currentUser = null;
    state.currentUserType = null;
    state.queueListeners = {};
    state.barbersListener = null;
    state.currentRating = null;
    
    utils.clearForm(elements.client);
    utils.clearForm(elements.barber);
    
    showScreen('roleSelection');
  } catch (error) {
    alert('حدث خطأ أثناء تسجيل الخروج: ' + error.message);
    console.error('Logout error:', error);
  }
}

// Initialize app
function init() {
  elements.client.citySearch.addEventListener('input', utils.debounce(filterBarbers, 300));
  
  setupRatingStars();
  
  // Load saved login data
  const savedBarberLogin = JSON.parse(localStorage.getItem('barber_login'));
  if (savedBarberLogin) {
    elements.barber.phone.value = savedBarberLogin.phone;
    elements.barber.password.value = savedBarberLogin.password;
    document.getElementById('rememberMeBarber').checked = true;
  }
  
  const savedClientData = JSON.parse(localStorage.getItem('client_data'));
  if (savedClientData) {
    elements.client.name.value = savedClientData.name;
    elements.client.phone.value = savedClientData.phone;
    document.getElementById('rememberMeClient').checked = true;
  }
  
  // Make functions available globally
  window.showScreen = showScreen;
  window.clientLogin = clientLogin;
  window.barberLogin = barberLogin;
  window.barberSignup = barberSignup;
  window.showBarberSignup = showBarberSignup;
  window.showBarberLogin = showBarberLogin;
  window.bookAppointment = bookAppointment;
  window.completeClient = completeClient;
  window.filterBarbers = filterBarbers;
  window.logout = logout;
  window.cancelBooking = cancelBooking;
  window.submitRating = submitRating;
  
  onAuthStateChanged(auth, (user) => {
    if (user && state.currentUserType === 'barber') {
      showBarberDashboard();
      loadBarberQueue();
    }
  });
  
  utils.adjustLayoutForMobile();
  window.addEventListener('resize', utils.adjustLayoutForMobile);
  
  showScreen('roleSelection');
}

// Start the app
init();
