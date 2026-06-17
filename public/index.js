document.addEventListener('DOMContentLoaded', () => {

  // Global variables to track state
  let currentSubmissionId = null;
  let selectedDate = null; // Date object
  let selectedTime = null; // String (e.g. "10:30 AM")
  
  // Date rendering focus
  let calendarDisplayMonth = new Date().getMonth();
  let calendarDisplayYear = new Date().getFullYear();

  // DOM Elements
  const formState = document.getElementById('state-form');
  const calendarState = document.getElementById('state-calendar');
  const thankyouState = document.getElementById('state-thankyou');
  
  const qualifyingForm = document.getElementById('qualifying-form');
  const btnSubmitForm = document.getElementById('btn-submit-form');
  
  const calendarDaysGrid = document.getElementById('calendar-days-grid');
  const calendarMonthYearLabel = document.getElementById('calendar-month-year');
  const prevMonthBtn = document.getElementById('prev-month-btn');
  const nextMonthBtn = document.getElementById('next-month-btn');
  
  const selectedDateLabel = document.getElementById('selected-date-label');
  const slotsContainer = document.getElementById('slots-container');
  const btnConfirmBooking = document.getElementById('btn-confirm-booking');

  // Available slots array
  const TIME_SLOTS = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', 
    '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM', 
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', 
    '4:00 PM', '4:30 PM'
  ];

  // Initialize view state
  formState.classList.add('fade-in');

  // Generate 14 available booking weekdays starting from tomorrow
  const availableBookingDates = [];
  function generateAvailableDates() {
    availableBookingDates.length = 0;
    let ptr = new Date();
    // Start from tomorrow
    ptr.setDate(ptr.getDate() + 1);
    
    while (availableBookingDates.length < 14) {
      const day = ptr.getDay();
      // Exclude Sunday (0) and Saturday (6)
      if (day !== 0 && day !== 6) {
        availableBookingDates.push(new Date(ptr));
      }
      ptr.setDate(ptr.getDate() + 1);
    }

    // Set default display calendar month/year to the first available date
    if (availableBookingDates.length > 0) {
      calendarDisplayMonth = availableBookingDates[0].getMonth();
      calendarDisplayYear = availableBookingDates[0].getFullYear();
    }
  }
  generateAvailableDates();

  // State Transition Helper (fade out + fade/slide in)
  function transitionTo(nextState) {
    const currentActive = document.querySelector('.state-view.active');
    if (currentActive) {
      currentActive.classList.remove('fade-in');
      setTimeout(() => {
        currentActive.classList.remove('active');
        nextState.classList.add('active');
        // Force reflow
        nextState.offsetHeight;
        nextState.classList.add('fade-in');
      }, 300);
    } else {
      nextState.classList.add('active');
      nextState.offsetHeight;
      nextState.classList.add('fade-in');
    }
  }

  // ==========================================================================
  // STATE 1: Form Validation & Submit
  // ==========================================================================

  // Validation functions
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function setError(inputEl, errorEl, message) {
    const group = inputEl.closest('.form-group');
    group.classList.add('invalid');
    errorEl.textContent = message;
  }

  function clearError(inputEl, errorEl) {
    const group = inputEl.closest('.form-group');
    group.classList.remove('invalid');
    errorEl.textContent = '';
  }

  // Monitor live inputs to clear errors once user starts typing/selecting
  qualifyingForm.querySelectorAll('input, select').forEach(field => {
    field.addEventListener('input', () => {
      const errorEl = document.getElementById(`error-${field.name}`);
      if (errorEl) clearError(field, errorEl);
    });
    field.addEventListener('change', () => {
      const errorEl = document.getElementById(`error-${field.name}`);
      if (errorEl) clearError(field, errorEl);
    });
  });

  qualifyingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let isValid = true;
    let firstErrorField = null;

    const nameField = document.getElementById('input-name');
    const positionField = document.getElementById('input-position');
    const companyField = document.getElementById('input-company');
    const emailField = document.getElementById('input-email');
    const teamField = document.getElementById('select-team');
    const hardestPartField = document.getElementById('select-hardest-part');
    const hiresCountField = document.getElementById('select-hires-count');
    const timelineField = document.getElementById('select-timeline');

    // Reset all errors
    qualifyingForm.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    qualifyingForm.querySelectorAll('.form-group').forEach(el => el.classList.remove('invalid'));

    // Validate Name
    if (!nameField.value.trim()) {
      setError(nameField, document.getElementById('error-name'), 'Name is required');
      isValid = false;
      if (!firstErrorField) firstErrorField = nameField;
    }

    // Validate Position
    if (!positionField.value.trim()) {
      setError(positionField, document.getElementById('error-position'), 'Position / Title is required');
      isValid = false;
      if (!firstErrorField) firstErrorField = positionField;
    }

    // Validate Company
    if (!companyField.value.trim()) {
      setError(companyField, document.getElementById('error-company'), 'Company name is required');
      isValid = false;
      if (!firstErrorField) firstErrorField = companyField;
    }

    // Validate Email
    if (!emailField.value.trim()) {
      setError(emailField, document.getElementById('error-email'), 'Email is required');
      isValid = false;
      if (!firstErrorField) firstErrorField = emailField;
    } else if (!validateEmail(emailField.value.trim())) {
      setError(emailField, document.getElementById('error-email'), 'Enter a valid email address');
      isValid = false;
      if (!firstErrorField) firstErrorField = emailField;
    }

    // Validate Team
    if (!teamField.value) {
      setError(teamField, document.getElementById('error-team'), 'Please select a team option');
      isValid = false;
      if (!firstErrorField) firstErrorField = teamField;
    }

    // Validate Hardest Part
    if (!hardestPartField.value) {
      setError(hardestPartField, document.getElementById('error-hardestPart'), 'Please select a hiring challenge option');
      isValid = false;
      if (!firstErrorField) firstErrorField = hardestPartField;
    }

    // Validate Hires Count
    if (!hiresCountField.value) {
      setError(hiresCountField, document.getElementById('error-hiresCount'), 'Please select the number of hires');
      isValid = false;
      if (!firstErrorField) firstErrorField = hiresCountField;
    }

    // Validate Timeline
    if (!timelineField.value) {
      setError(timelineField, document.getElementById('error-timeline'), 'Please select a hiring timeline');
      isValid = false;
      if (!firstErrorField) firstErrorField = timelineField;
    }

    if (!isValid) {
      if (firstErrorField) firstErrorField.focus();
      return;
    }

    // Submit payload
    const payload = {
      name: nameField.value.trim(),
      position: positionField.value.trim(),
      company: companyField.value.trim(),
      email: emailField.value.trim(),
      team: teamField.value,
      hardestPart: hardestPartField.value,
      hiresCount: hiresCountField.value,
      timeline: timelineField.value
    };

    // Button loading animation
    btnSubmitForm.disabled = true;
    btnSubmitForm.querySelector('.btn-text').textContent = 'Submitting...';
    btnSubmitForm.querySelector('.btn-spinner').classList.remove('hidden');

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (response.ok && data.success) {
        currentSubmissionId = data.submissionId;
        
        // Transition to calendar view
        renderCalendar();
        transitionTo(calendarState);
      } else {
        // Handle server-side errors mapping
        if (data.errors) {
          Object.keys(data.errors).forEach(fieldName => {
            const field = document.querySelector(`[name="${fieldName}"]`);
            const errEl = document.getElementById(`error-${fieldName}`);
            if (field && errEl) {
              setError(field, errEl, data.errors[fieldName]);
            }
          });
        } else {
          alert('Submission failed: ' + (data.message || 'Unknown error'));
        }
      }
    } catch (err) {
      console.error('API Error:', err);
      alert('An error occurred. Please check your internet connection.');
    } finally {
      // Restore submit button state
      btnSubmitForm.disabled = false;
      btnSubmitForm.querySelector('.btn-text').textContent = 'Book a call';
      btnSubmitForm.querySelector('.btn-spinner').classList.add('hidden');
    }
  });

  // ==========================================================================
  // STATE 2: Custom Booking Calendar Widget
  // ==========================================================================

  // Format month name
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function renderCalendar() {
    calendarMonthYearLabel.textContent = `${MONTHS[calendarDisplayMonth]} ${calendarDisplayYear}`;
    calendarDaysGrid.innerHTML = '';

    // First day of month and total days
    const firstDayIndex = new Date(calendarDisplayYear, calendarDisplayMonth, 1).getDay(); // Sun=0, Mon=1, etc.
    const totalDays = new Date(calendarDisplayYear, calendarDisplayMonth + 1, 0).getDate();

    // Map starting index to Monday start (Mo=0, Tu=1, ..., Sa=5, Su=6)
    // Javascript standard: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    let startingEmptyCells = firstDayIndex - 1;
    if (startingEmptyCells < 0) startingEmptyCells = 6; // Sunday is index 6 in our layout

    // Prepend empty cells
    for (let i = 0; i < startingEmptyCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'day-cell disabled';
      calendarDaysGrid.appendChild(cell);
    }

    const todayDate = new Date();

    // Render calendar days
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(calendarDisplayYear, calendarDisplayMonth, d);
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      cell.textContent = d;

      // Check if it is a today date
      if (dateObj.getDate() === todayDate.getDate() && 
          dateObj.getMonth() === todayDate.getMonth() && 
          dateObj.getFullYear() === todayDate.getFullYear()) {
        cell.classList.add('today');
      }

      // Check if this date matches any of the 14 available booking weekdays
      const matchedBookingDate = availableBookingDates.find(availDate => 
        availDate.getDate() === d &&
        availDate.getMonth() === calendarDisplayMonth &&
        availDate.getFullYear() === calendarDisplayYear
      );

      if (matchedBookingDate) {
        // Make date selectable
        cell.dataset.dateString = matchedBookingDate.toISOString();
        
        // Retain selected class if it matches selectedDate
        if (selectedDate && 
            selectedDate.getDate() === d &&
            selectedDate.getMonth() === calendarDisplayMonth &&
            selectedDate.getFullYear() === calendarDisplayYear) {
          cell.classList.add('selected');
        }

        cell.addEventListener('click', () => {
          document.querySelectorAll('.day-cell.selected').forEach(el => el.classList.remove('selected'));
          cell.classList.add('selected');
          
          selectedDate = matchedBookingDate;
          selectedTime = null; // reset slot selection
          btnConfirmBooking.disabled = true;
          
          displayTimeSlots(matchedBookingDate);
        });
      } else {
        // Disabled day
        cell.classList.add('disabled');
      }

      calendarDaysGrid.appendChild(cell);
    }

    // Toggle navigation buttons to prevent navigating away from bookable months
    updateCalendarNavs();
  }

  // Prev/Next month button display conditions
  function updateCalendarNavs() {
    if (availableBookingDates.length === 0) return;
    
    const minDate = availableBookingDates[0];
    const maxDate = availableBookingDates[availableBookingDates.length - 1];

    const currentDisplayDate = new Date(calendarDisplayYear, calendarDisplayMonth, 1);
    const minDisplayDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const maxDisplayDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

    prevMonthBtn.disabled = (currentDisplayDate <= minDisplayDate);
    nextMonthBtn.disabled = (currentDisplayDate >= maxDisplayDate);
  }

  prevMonthBtn.addEventListener('click', () => {
    calendarDisplayMonth--;
    if (calendarDisplayMonth < 0) {
      calendarDisplayMonth = 11;
      calendarDisplayYear--;
    }
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    calendarDisplayMonth++;
    if (calendarDisplayMonth > 11) {
      calendarDisplayMonth = 0;
      calendarDisplayYear++;
    }
    renderCalendar();
  });

  // Display available slots for selected date
  function displayTimeSlots(date) {
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    selectedDateLabel.textContent = formattedDate;
    slotsContainer.innerHTML = '';

    TIME_SLOTS.forEach(slot => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot-pill';
      button.textContent = slot;

      button.addEventListener('click', () => {
        document.querySelectorAll('.slot-pill.selected').forEach(el => el.classList.remove('selected'));
        button.classList.add('selected');
        selectedTime = slot;
        
        // Enable checkout button
        btnConfirmBooking.disabled = false;
      });

      slotsContainer.appendChild(button);
    });
  }

  // Handle slot reservation checkout
  btnConfirmBooking.addEventListener('click', async () => {
    if (!currentSubmissionId || !selectedDate || !selectedTime) {
      alert('Please select a date and a time slot first.');
      return;
    }

    const dateStr = selectedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Button loading
    btnConfirmBooking.disabled = true;
    btnConfirmBooking.querySelector('.btn-text').textContent = 'Booking...';
    btnConfirmBooking.querySelector('.btn-spinner').classList.remove('hidden');

    try {
      const response = await fetch('/api/book-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: currentSubmissionId,
          date: dateStr,
          time: selectedTime,
          name: document.getElementById('input-name').value.trim(),
          position: document.getElementById('input-position').value.trim(),
          company: document.getElementById('input-company').value.trim(),
          email: document.getElementById('input-email').value.trim(),
          team: document.getElementById('select-team').value,
          hardestPart: document.getElementById('select-hardest-part').value,
          hiresCount: document.getElementById('select-hires-count').value,
          timeline: document.getElementById('select-timeline').value
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        // Transition to thank you state
        transitionTo(thankyouState);
      } else {
        alert('Booking confirmation failed: ' + (data.message || 'Unknown error'));
        btnConfirmBooking.disabled = false;
      }
    } catch (err) {
      console.error('Booking confirmation API failure:', err);
      alert('An error occurred. Please check your network connection.');
      btnConfirmBooking.disabled = false;
    } finally {
      btnConfirmBooking.querySelector('.btn-text').textContent = 'Confirm Booking';
      btnConfirmBooking.querySelector('.btn-spinner').classList.add('hidden');
    }
  });

});
