
      let data = JSON.parse(localStorage.getItem("payout_tracker_data")) || {
        current_month: [],
        history: [],
      };

      // Migration
      if (!data.settings) {
        data.settings = { rate: 25 };
      }
      if (!data.settings.theme) {
        data.settings.theme = 'copper';
      }
      if (!data.settings.currency) {
        data.settings.currency = 'none';
      }
      if (!data.settings.currency_rate) {
        data.settings.currency_rate = 41.5;
      }
      if (typeof data.goal === "undefined") {
        data.goal = 0;
      }

      window.onload = function () {
        applyTheme(data.settings.theme || 'copper');
        resetShiftDate();
        render();
      };

      function resetShiftDate() {
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("input-shift-date").value = today;
      }

      function saveData() {
        localStorage.setItem("payout_tracker_data", JSON.stringify(data));
        render();
      }

      function addShift() {
        const accsInput = document.getElementById("input-accs");
        const bonusInput = document.getElementById("input-bonus");
        const dateInput = document.getElementById("input-shift-date");

        const accs = parseInt(accsInput.value) || 0;
        const bonus = parseInt(bonusInput.value) || 0;

        if (accs <= 0) {
          alert("Введіть кількість акаунтів!");
          return;
        }

        const rawDate = new Date(dateInput.value);
        const dateStr = isNaN(rawDate)
          ? "00.00"
          : `${String(rawDate.getDate()).padStart(2, "0")}.${String(rawDate.getMonth() + 1).padStart(2, "0")}`;

        const total_100 = accs * data.settings.rate + bonus;

        data.current_month.push({
          date: dateStr,
          accounts: accs,
          bonus: bonus,
          total_100: total_100,
        });

        accsInput.value = "";
        bonusInput.value = "0";
        resetShiftDate();
        saveData();
      }

      function deleteShift(index) {
        if (confirm("Видалити цей запис про зміну?")) {
          data.current_month.splice(index, 1);
          saveData();
        }
      }

      function clearAllHistory() {
        if (confirm("Ви впевнені, що хочете повністю стерти всю історію минулих місяців? Ця дія незворотня!")) {
          data.history = [];
          saveData();
        }
      }

      function toggleHistoryDetails(index) {
        const detailsDiv = document.getElementById(`history-details-${index}`);
        if (detailsDiv) {
          if (detailsDiv.style.display === "block") {
            detailsDiv.style.display = "none";
          } else {
            detailsDiv.style.display = "block";
          }
        }
      }

      let currentPeriodPredict = 0;

      function openCloseMonthModal() {
        if (data.current_month.length === 0) {
          alert("Поточний період порожній!");
          return;
        }

        let totalAccounts = data.current_month.reduce((sum, item) => sum + item.accounts, 0);
        let totalBonus = data.current_month.reduce((sum, item) => sum + item.bonus, 0);
        const base = totalAccounts * data.settings.rate;
        const pred100 = base + totalBonus;
        const pred50 = base * 0.5 + totalBonus;
        // Store 50% as the realistic predicted payout
        currentPeriodPredict = pred50;

        document.getElementById("modal-predict-text").innerText =
          `Очікувана виплата (50%): ${formatMoney(pred50)}\nПовний предикт (100%): ${formatMoney(pred100)}`;

        const today = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);

        document.getElementById("modal-end-date").value = today.toISOString().split("T")[0];
        document.getElementById("modal-start-date").value = oneMonthAgo.toISOString().split("T")[0];

        document.getElementById("close-period-modal").style.display = "flex";
      }

      function closeModal(modalId) {
        if (!modalId || modalId === "close-period-modal") {
           document.getElementById("close-period-modal").style.display = "none";
           document.getElementById("modal-actual-paid").value = "";
        } else {
           const el = document.getElementById(modalId);
           if (el) el.style.display = "none";
        }
      }

      function submitCloseMonth() {
        const actualPaidInput = document.getElementById("modal-actual-paid");
        const startDateInput = document.getElementById("modal-start-date");
        const endDateInput = document.getElementById("modal-end-date");

        const actualPaid = parseInt(actualPaidInput.value);
        if (isNaN(actualPaid)) {
          alert("Помилка! Введіть коректну суму реальної виплати.");
          return;
        }

        const start = new Date(startDateInput.value);
        const end = new Date(endDateInput.value);

        const formatF = (d) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
        const periodName = `${formatF(start)} — ${formatF(end)}`;

        data.history.unshift({
          period: periodName,
          predicted: currentPeriodPredict,
          actual: actualPaid,
          diff: actualPaid - currentPeriodPredict,
          shifts_archive: [...data.current_month],
        });

        data.current_month = [];
        saveData();
        closeModal();
      }

      // --- Currency & Format Helper ---

      function formatMoney(amountUah) {
        if (!data.settings.currency || data.settings.currency === 'none' || !data.settings.currency_rate || data.settings.currency_rate <= 0) {
          return `${amountUah} грн.`;
        }
        const converted = (amountUah / data.settings.currency_rate).toFixed(1);
        const symbolMap = {
          'USD': '$',
          'EUR': '€',
          'USDT': '₮'
        };
        const sym = symbolMap[data.settings.currency] || '';
        return `${amountUah} грн. · ${sym}${converted}`;
      }

      // --- Theme Logic ---

      function applyTheme(themeName) {
        if (themeName === 'copper' || !themeName) {
          document.body.removeAttribute('data-theme');
        } else {
          document.body.setAttribute('data-theme', themeName);
        }
        document.querySelectorAll('.theme-chip').forEach(chip => chip.classList.remove('active'));
        const activeBtn = document.getElementById(`theme-btn-${themeName || 'copper'}`);
        if (activeBtn) activeBtn.classList.add('active');
      }

      function selectTheme(themeName) {
        applyTheme(themeName);
        data.settings.theme = themeName;
        saveData();
      }

      // --- Settings Logic ---

      function toggleCurrencyRateInput() {
        // Currency rate is now auto-fetched from NBU — no manual input needed
      }

      function openSettingsModal() {
        document.getElementById("input-rate").value = data.settings.rate;
        document.getElementById("select-currency").value = data.settings.currency || 'none';
        applyTheme(data.settings.theme || 'copper');
        // Trigger NBU rate fetch when opening settings
        if (typeof fetchNbuRates === 'function') fetchNbuRates(false);
        document.getElementById("settings-modal").style.display = "flex";
      }

      function saveSettings() {
        const newRate = parseInt(document.getElementById("input-rate").value);
        const newCurrency = document.getElementById("select-currency").value;

        if (newRate > 0) {
          data.settings.rate = newRate;
          data.settings.currency = newCurrency;
          // currency_rate is managed automatically by fetchNbuRates()
          data.current_month.forEach(shift => {
             shift.total_100 = shift.accounts * data.settings.rate + shift.bonus;
          });
          saveData();
          closeModal("settings-modal");
        } else {
          alert("Введіть коректну ставку");
        }
      }

      function exportData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "work_tracker_backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      }

      function importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.current_month && importedData.history) {
               data = importedData;
               if (!data.settings) data.settings = { rate: 25, theme: 'copper', currency: 'none', currency_rate: 41.5 };
               if (typeof data.goal === "undefined") data.goal = 0;
               applyTheme(data.settings.theme || 'copper');
               saveData();
               closeModal("settings-modal");
               alert("Дані успішно імпортовано!");
            } else {
               alert("Невірний формат файлу!");
            }
          } catch(err) {
            alert("Помилка читання файлу!");
          }
        };
        reader.readAsText(file);
      }

      // --- Goal Logic ---

      function openGoalModal() {
        document.getElementById("input-goal").value = data.goal || "";
        document.getElementById("goal-modal").style.display = "flex";
      }

      function saveGoal() {
        const newGoal = parseInt(document.getElementById("input-goal").value);
        if (newGoal > 0) {
          data.goal = newGoal;
          hasFiredConfettiForGoal = false;
          saveData();
          closeModal("goal-modal");
        } else {
          alert("Введіть коректну ціль");
        }
      }

      function clearGoal() {
        data.goal = 0;
        hasFiredConfettiForGoal = false;
        saveData();
        closeModal("goal-modal");
      }

      // --- Edit Shift Logic ---

      function openEditModal(index) {
        const item = data.current_month[index];
        const parts = item.date.split('.');
        const year = new Date().getFullYear();
        const dateStr = `${year}-${parts[1]}-${parts[0]}`;
        
        document.getElementById("edit-shift-index").value = index;
        document.getElementById("edit-shift-date").value = dateStr;
        document.getElementById("edit-accs").value = item.accounts;
        document.getElementById("edit-bonus").value = item.bonus;
        
        document.getElementById("edit-shift-modal").style.display = "flex";
      }

      function saveEditShift() {
        const index = document.getElementById("edit-shift-index").value;
        const accs = parseInt(document.getElementById("edit-accs").value) || 0;
        const bonus = parseInt(document.getElementById("edit-bonus").value) || 0;
        const dateInput = document.getElementById("edit-shift-date").value;
        
        if (accs <= 0) {
          alert("Введіть кількість акаунтів!");
          return;
        }

        const rawDate = new Date(dateInput);
        const dateStr = isNaN(rawDate)
          ? "00.00"
          : `${String(rawDate.getDate()).padStart(2, "0")}.${String(rawDate.getMonth() + 1).padStart(2, "0")}`;

        const total_100 = accs * data.settings.rate + bonus;

        data.current_month[index] = {
          date: dateStr,
          accounts: accs,
          bonus: bonus,
          total_100: total_100,
        };

        saveData();
        closeModal("edit-shift-modal");
      }

      // --- Confetti & Celebration ---
      let hasFiredConfettiForGoal = false;

      function checkAndTriggerGoalConfetti(pred50) {
        if (data.goal && data.goal > 0 && pred50 >= data.goal) {
          if (!hasFiredConfettiForGoal) {
            hasFiredConfettiForGoal = true;
            if (typeof confetti === 'function') {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              });
              setTimeout(() => {
                confetti({
                  particleCount: 50,
                  angle: 60,
                  spread: 55,
                  origin: { x: 0 }
                });
                confetti({
                  particleCount: 50,
                  angle: 120,
                  spread: 55,
                  origin: { x: 1 }
                });
              }, 250);
            }
          }
        } else if (data.goal && data.goal > 0 && pred50 < data.goal) {
          hasFiredConfettiForGoal = false;
        }
      }

      // --- Activity Hub (Calendar, Records, Receipt) ---

      let calCurrentDate = new Date();

      function openHubModal() {
        renderHubData();
        document.getElementById("hub-modal").style.display = "flex";
      }

      function switchHubTab(tabName) {
        document.querySelectorAll(".hub-tab").forEach(tab => tab.classList.remove("active"));
        document.querySelectorAll(".hub-tab-pane").forEach(pane => pane.style.display = "none");

        const activeTabBtn = document.getElementById(`tab-btn-${tabName}`);
        const activePane = document.getElementById(`pane-${tabName}`);
        
        if (activeTabBtn) activeTabBtn.classList.add("active");
        if (activePane) {
          activePane.style.display = "block";
        }
      }

      function prevMonthCal() {
        calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
        renderCalendar();
      }

      function nextMonthCal() {
        calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
        renderCalendar();
      }

      function renderCalendar() {
        const monthNames = [
          "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
          "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
        ];
        const year = calCurrentDate.getFullYear();
        const month = calCurrentDate.getMonth();

        document.getElementById("cal-month-title").innerText = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const startDayOffset = (firstDay + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const grid = document.getElementById("calendar-days-grid");
        grid.innerHTML = "";

        let allShifts = [...data.current_month];
        if (data.history) {
          data.history.forEach(h => {
            if (h.shifts_archive) {
              allShifts = allShifts.concat(h.shifts_archive);
            }
          });
        }

        for (let i = 0; i < startDayOffset; i++) {
          const empty = document.createElement("div");
          empty.className = "cal-day empty";
          grid.appendChild(empty);
        }

        const monthStr = String(month + 1).padStart(2, "0");

        for (let d = 1; d <= daysInMonth; d++) {
          const dayStr = String(d).padStart(2, "0");
          const dateFormatted = `${dayStr}.${monthStr}`;

          const dayShifts = allShifts.filter(s => s.date === dateFormatted);
          const dayEl = document.createElement("div");
          dayEl.className = "cal-day";
          dayEl.innerText = d;

          if (dayShifts.length > 0) {
            dayEl.classList.add("has-shift");
            dayEl.onclick = () => {
              document.querySelectorAll(".cal-day").forEach(el => el.classList.remove("selected"));
              dayEl.classList.add("selected");
              const totalAccs = dayShifts.reduce((s, x) => s + x.accounts, 0);
              const totalBonus = dayShifts.reduce((s, x) => s + x.bonus, 0);
              const totalIncome = totalAccs * data.settings.rate * 0.5 + totalBonus;
              document.getElementById("cal-day-details").innerHTML = `
                <span>📅 <b>${dateFormatted}</b>: ${totalAccs} ак. | +${totalBonus} грн. | <b>${formatMoney(totalIncome)}</b></span>
              `;
            };
          } else {
            dayEl.onclick = () => {
              document.querySelectorAll(".cal-day").forEach(el => el.classList.remove("selected"));
              dayEl.classList.add("selected");
              document.getElementById("cal-day-details").innerHTML = `
                <span>📅 ${dateFormatted}: змін не зафіксовано</span>
              `;
            };
          }

          grid.appendChild(dayEl);
        }
      }

      function renderRecords() {
        let allShifts = [...data.current_month];
        let allHistoryPaid = 0;

        if (data.history) {
          data.history.forEach(h => {
            allHistoryPaid += (h.actual || 0);
            if (h.shifts_archive) {
              allShifts = allShifts.concat(h.shifts_archive);
            }
          });
        }

        let maxAccs = 0;
        let maxAccsDate = "—";
        let maxIncome = 0;
        let maxIncomeDate = "—";
        let totalAccs = 0;

        allShifts.forEach(s => {
          totalAccs += (s.accounts || 0);
          // Record uses 50% — the realistic payout per shift
          const shiftIncome50 = (s.accounts || 0) * data.settings.rate * 0.5 + (s.bonus || 0);

          if (s.accounts > maxAccs) {
            maxAccs = s.accounts;
            maxAccsDate = s.date;
          }
          if (shiftIncome50 > maxIncome) {
            maxIncome = shiftIncome50;
            maxIncomeDate = s.date;
          }
        });

        document.getElementById("rec-max-accs").innerText = `${maxAccs} ак.`;
        document.getElementById("rec-max-accs-date").innerText = maxAccsDate !== "—" ? `Дата: ${maxAccsDate}` : "—";

        document.getElementById("rec-max-income").innerText = formatMoney(maxIncome);
        document.getElementById("rec-max-income-date").innerText = maxIncomeDate !== "—" ? `Дата: ${maxIncomeDate}` : "—";

        document.getElementById("rec-total-accs").innerText = `${totalAccs} ак.`;

        // Total income = only real paid amounts from closed periods (entered manually on period close)
        document.getElementById("rec-total-income").innerText =
          allHistoryPaid > 0 ? formatMoney(allHistoryPaid) : "Немає закритих періодів";
      }

      function renderReceipt() {
        const today = new Date();
        const dateFormatted = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
        document.getElementById("receipt-current-date").innerText = `Дата звіту: ${dateFormatted}`;

        const totalAccounts = data.current_month.reduce((sum, item) => sum + item.accounts, 0);
        const totalBonus = data.current_month.reduce((sum, item) => sum + item.bonus, 0);
        const base = totalAccounts * data.settings.rate;
        const pred50 = base * 0.5 + totalBonus;
        const pred100 = base + totalBonus;

        document.getElementById("receipt-shifts-count").innerText = `${data.current_month.length}`;
        document.getElementById("receipt-total-accs").innerText = `${totalAccounts} ак.`;
        document.getElementById("receipt-rate").innerText = `${data.settings.rate} грн.`;
        document.getElementById("receipt-bonuses").innerText = `+${totalBonus} грн.`;
        document.getElementById("receipt-pred-50").innerText = formatMoney(pred50);
        document.getElementById("receipt-pred-100").innerText = formatMoney(pred100);
      }

      function printReceipt() {
        window.print();
      }

      function renderHubData() {
        renderCalendar();
        renderRecords();
        renderReceipt();
      }

      // --- Chart.js Logic ---

      let historyChartInstance = null;

      function renderChart() {
         const ctx = document.getElementById('historyChart');
         if (!ctx) return;
         
         if (historyChartInstance) {
             historyChartInstance.destroy();
         }

         if (data.history.length === 0) {
             ctx.style.display = 'none';
             return;
         }
         ctx.style.display = 'block';

         const chartData = data.history.slice(0, 6).reverse();
         
         const labels = chartData.map(h => h.period.split(' — ')[0]);
         const actuals = chartData.map(h => h.actual);
         const predicts = chartData.map(h => h.predicted);

         historyChartInstance = new Chart(ctx, {
             type: 'line',
             data: {
                 labels: labels,
                 datasets: [
                     {
                         label: 'Фактично',
                         data: actuals,
                         borderColor: '#52d68a',
                         backgroundColor: 'rgba(82, 214, 138, 0.1)',
                         borderWidth: 2,
                         tension: 0.3,
                         fill: true
                     },
                     {
                         label: 'Предикт',
                         data: predicts,
                         borderColor: '#e2a25a',
                         borderWidth: 2,
                         borderDash: [5, 5],
                         tension: 0.3,
                         fill: false
                     }
                 ]
             },
             options: {
                 responsive: true,
                 maintainAspectRatio: false,
                 color: '#a89e8c',
                 scales: {
                     y: {
                         beginAtZero: true,
                         grid: {
                             color: 'rgba(248, 244, 236, 0.05)'
                         },
                         ticks: {
                             color: '#a89e8c',
                             font: { size: 10 }
                         }
                     },
                     x: {
                         grid: {
                             color: 'rgba(248, 244, 236, 0.05)'
                         },
                         ticks: {
                             color: '#a89e8c',
                             font: { size: 10 }
                         }
                     }
                 },
                 plugins: {
                     legend: {
                         labels: {
                             color: '#ddd4c4',
                             boxWidth: 12
                         }
                     }
                 }
             }
         });
      }

      function render() {
        let totalAccounts = data.current_month.reduce((sum, item) => sum + item.accounts, 0);
        let totalBonus = data.current_month.reduce((sum, item) => sum + item.bonus, 0);
        let base = totalAccounts * data.settings.rate;
        let pred50 = base * 0.5 + totalBonus;
        let pred100 = base + totalBonus;

        document.getElementById("total-accs").innerText = totalAccounts + " шт.";
        document.getElementById("total-bonus").innerText = totalBonus + " грн.";
        document.getElementById("pred-50").innerText = formatMoney(pred50);
        document.getElementById("pred-100").innerText = formatMoney(pred100);

        let avgPerShift = data.current_month.length > 0 ? Math.round(pred100 / data.current_month.length) : 0;
        document.getElementById("avg-per-shift").innerText = formatMoney(avgPerShift);

        // Goal Logic
        const goalSection = document.getElementById("goal-section");
        if (data.goal && data.goal > 0) {
           goalSection.style.display = "block";
           const percent = Math.min(Math.round((pred50 / data.goal) * 100), 100);
           document.getElementById("goal-text").innerText = `${pred50} / ${data.goal} грн. (${percent}%)`;
           document.getElementById("goal-fill").style.width = `${percent}%`;
           checkAndTriggerGoalConfetti(pred50);
        } else {
           goalSection.style.display = "none";
        }

        const shiftsList = document.getElementById("current-shifts-list");
        shiftsList.innerHTML = data.current_month.length === 0 ? '<div class="empty-state">Змін поки немає</div>' : "";

        data.current_month.forEach((item, index) => {
          const div = document.createElement("div");
          div.className = "shift-item";
          div.innerHTML = `
                <div>
                    <span class="shift-date">${item.date}</span>
                    <span class="shift-detail">${item.accounts} ак. + ${item.bonus} грн.</span>
                </div>
                <div>
                    <button class="edit-btn" onclick="openEditModal(${index})">Ред.</button>
                    <button class="delete-btn" onclick="deleteShift(${index})">Видалити</button>
                </div>
            `;
          shiftsList.appendChild(div);
        });

        const historyList = document.getElementById("history-list");
        historyList.innerHTML = data.history.length === 0 ? '<div class="empty-state">Архів порожній</div>' : "";

        data.history.forEach((item, index) => {
          const div = document.createElement("div");
          div.className = "history-item-clickable";
          div.setAttribute("onclick", `toggleHistoryDetails(${index})`);

          const isPlus = item.diff >= 0;
          const diffClass = isPlus ? "diff-plus" : "diff-minus";
          const diffText = `${isPlus ? "+" : ""}${item.diff} грн.`;

          let sublistHtml = "";
          if (item.shifts_archive && item.shifts_archive.length > 0) {
            item.shifts_archive.forEach((subItem) => {
              sublistHtml += `
                <div class="sublist-item">
                    <span>📅 ${subItem.date}</span>
                    <span>${subItem.accounts} ак. | +${subItem.bonus} грн.</span>
                </div>
              `;
            });
          } else {
            sublistHtml = '<div style="color:var(--ink-muted); font-size:11px; text-align:center; font-style:italic;">Деталізація змін недоступна</div>';
          }

          div.innerHTML = `
                <div style="display:flex; justify-content: space-between; align-items:center;">
                    <span style="font-weight:600; color:var(--ink); font-size:13.5px;">${item.period}</span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="history-diff ${diffClass}">${diffText}</span>
                        <button class="edit-btn" onclick="event.stopPropagation(); openEditHistoryModal(${index})" style="padding:2px 8px; font-size:10px;">Ред.</button>
                        <button class="delete-btn" onclick="event.stopPropagation(); deleteHistoryItem(${index})" style="padding:2px 8px; font-size:10px;">✕</button>
                    </div>
                </div>
                <div style="font-size:12.5px; color:var(--ink-soft); display:flex; justify-content:space-between;">
                    <span>Предикт: <b style="color:var(--ink);">${item.predicted} грн.</b></span>
                    <span>Факт: <b style="color:var(--ink);">${item.actual} грн.</b></span>
                </div>
                <div class="history-details-hidden" id="history-details-${index}" onclick="event.stopPropagation();">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.04em; font-weight:600; color:var(--ink-muted); margin-bottom:4px;">📋 Архів змін:</div>
                    <div class="history-shifts-sublist">
                        ${sublistHtml}
                    </div>
                </div>
            `;
          historyList.appendChild(div);
        });

        renderChart();
      }

      // --- Edit / Delete History Entry ---

      let editingHistoryIndex = -1;

      function openEditHistoryModal(index) {
        editingHistoryIndex = index;
        const item = data.history[index];
        document.getElementById('edit-hist-period').value = item.period;
        document.getElementById('edit-hist-predicted').value = item.predicted;
        document.getElementById('edit-hist-actual').value = item.actual;
        document.getElementById('edit-history-modal').style.display = 'flex';
      }

      function saveHistoryEdit() {
        if (editingHistoryIndex < 0) return;
        const item = data.history[editingHistoryIndex];
        const newPeriod = document.getElementById('edit-hist-period').value.trim();
        const newPredicted = parseFloat(document.getElementById('edit-hist-predicted').value) || 0;
        const newActual = parseFloat(document.getElementById('edit-hist-actual').value);
        if (isNaN(newActual)) {
          alert('Введіть коректну суму фактичної виплати');
          return;
        }
        item.period = newPeriod || item.period;
        item.predicted = newPredicted;
        item.actual = newActual;
        item.diff = newActual - newPredicted;
        saveData();
        closeModal('edit-history-modal');
        editingHistoryIndex = -1;
      }

      function deleteHistoryItem(index) {
        const item = data.history[index];
        if (confirm(`Видалити запис «${item.period}»?\nЦю дію не можна скасувати.`)) {
          data.history.splice(index, 1);
          saveData();
        }
      }

      // --- NBU Exchange Rate ---

      let nbuRates = {};

      async function fetchNbuRates(forceRefresh) {
        const badgeText = document.getElementById('nbu-rate-text');
        const currency = data.settings.currency;

        if (!currency || currency === 'none') {
          if (badgeText) badgeText.textContent = '🏛️ Конвертація вимкнена';
          return;
        }

        // Use cached rates unless forced
        if (!forceRefresh && nbuRates[currency]) {
          updateNbuBadge(currency, nbuRates[currency]);
          return;
        }

        if (badgeText) badgeText.textContent = '🏛️ Курс НБУ: завантаження...';

        try {
          // NBU API: https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json
          const resp = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json');
          if (!resp.ok) throw new Error('Network error');
          const rates = await resp.json();

          const usd = rates.find(r => r.cc === 'USD');
          const eur = rates.find(r => r.cc === 'EUR');
          if (usd) nbuRates['USD'] = usd.rate;
          if (eur) nbuRates['EUR'] = eur.rate;

          const rate = nbuRates[currency];
          if (rate) {
            data.settings.currency_rate = rate;
            saveData();
            updateNbuBadge(currency, rate);
          } else {
            if (badgeText) badgeText.textContent = '⚠️ Курс НБУ не знайдено';
          }
        } catch (e) {
          if (badgeText) badgeText.textContent = '⚠️ Не вдалося завантажити курс НБУ';
          console.warn('NBU fetch error:', e);
        }
      }

      function updateNbuBadge(currency, rate) {
        const badgeText = document.getElementById('nbu-rate-text');
        const sym = currency === 'USD' ? '$' : '€';
        if (badgeText) {
          badgeText.textContent = `🏛️ Курс НБУ: 1 ${sym} = ${rate.toFixed(2)} ₴`;
        }
      }

      function onCurrencySelectChange() {
        const newCurrency = document.getElementById('select-currency').value;
        data.settings.currency = newCurrency;
        saveData();
        fetchNbuRates(false);
      }
