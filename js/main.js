
      let data = JSON.parse(localStorage.getItem("payout_tracker_data")) || {
        current_month: [],
        history: [],
      };

      // Migration
      if (!data.settings) {
        data.settings = { rate: 25 };
      }
      if (typeof data.goal === "undefined") {
        data.goal = 0;
      }

      window.onload = function () {
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
        currentPeriodPredict = totalAccounts * data.settings.rate + totalBonus;

        document.getElementById("modal-predict-text").innerText = `100% Предикт системи за поточні зміни: ${currentPeriodPredict} грн.`;

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
           document.getElementById(modalId).style.display = "none";
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

      // --- New Features Logic ---

      function openSettingsModal() {
        document.getElementById("input-rate").value = data.settings.rate;
        document.getElementById("settings-modal").style.display = "flex";
      }

      function saveSettings() {
        const newRate = parseInt(document.getElementById("input-rate").value);
        if (newRate > 0) {
          data.settings.rate = newRate;
          // recalculate predictions in current month
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
               if (!data.settings) data.settings = { rate: 25 };
               if (typeof data.goal === "undefined") data.goal = 0;
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

      function openGoalModal() {
        document.getElementById("input-goal").value = data.goal || "";
        document.getElementById("goal-modal").style.display = "flex";
      }

      function saveGoal() {
        const newGoal = parseInt(document.getElementById("input-goal").value);
        if (newGoal > 0) {
          data.goal = newGoal;
          saveData();
          closeModal("goal-modal");
        } else {
          alert("Введіть коректну ціль");
        }
      }

      function clearGoal() {
        data.goal = 0;
        saveData();
        closeModal("goal-modal");
      }

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

         // Take up to 6 last periods and reverse for chronological order
         const chartData = data.history.slice(0, 6).reverse();
         
         const labels = chartData.map(h => h.period.split(' — ')[0]); // Using start date for label
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
        let pred100 = base + totalBonus;

        document.getElementById("total-accs").innerText = totalAccounts + " шт.";
        document.getElementById("total-bonus").innerText = totalBonus + " грн.";
        document.getElementById("pred-50").innerText = (base * 0.5 + totalBonus) + " грн.";
        document.getElementById("pred-100").innerText = pred100 + " грн.";

        let avgPerShift = data.current_month.length > 0 ? Math.round(pred100 / data.current_month.length) : 0;
        document.getElementById("avg-per-shift").innerText = avgPerShift + " грн.";

        // Goal Logic
        const goalSection = document.getElementById("goal-section");
        if (data.goal && data.goal > 0) {
           goalSection.style.display = "block";
           let pred50 = base * 0.5 + totalBonus;
           const percent = Math.min(Math.round((pred50 / data.goal) * 100), 100);
           document.getElementById("goal-text").innerText = `${pred50} / ${data.goal} грн. (${percent}%)`;
           document.getElementById("goal-fill").style.width = `${percent}%`;
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
                    <span class="history-diff ${diffClass}">${diffText}</span>
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
