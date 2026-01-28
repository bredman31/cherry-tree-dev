 
 <!-- ================================ -->
<!-- SECTION 5.1.1: CREDIT BALANCE SYSTEM -->
<!-- ================================ -->

    // Global credit state
    window.counsellorCreditBalance = 0;
    
    /**
     * Load credit balance from Firebase
     */
    async function loadCreditBalance() {
      const counsellorId = window.clientId;
      if (!counsellorId) {
        console.log('💳 No clientId, skipping credit load');
        return 0;
      }
      
      try {
        console.log('💳 Loading credit balance for counsellor:', counsellorId);
        const snapshot = await database.ref('credits/' + counsellorId + '/balance').once('value');
        const balance = snapshot.val() || 0;
        
        window.counsellorCreditBalance = balance;
        console.log('💳 Credit balance loaded:', balance, 'pence (£' + (balance/100).toFixed(2) + ')');
        
        updateCreditBalanceDisplay(balance);
        return balance;
      } catch (error) {
        console.error('💳 Error loading credit balance:', error);
        window.counsellorCreditBalance = 0;
        return 0;
      }
    }
    
    /**
     * Update the credit balance display in the UI
     */
    function updateCreditBalanceDisplay(balanceInPence) {
      const section = document.getElementById('creditBalanceSection');
      const amountEl = document.getElementById('creditBalanceAmount');
      const noteEl = document.getElementById('creditBalanceNote');
      
      if (!section || !amountEl) return;
      
      // Only show if counsellor is logged in with token
      const hasToken = !!sessionStorage.getItem('accessToken');
      
      if (hasToken) {
        section.style.display = 'block';
        amountEl.textContent = '£' + (balanceInPence / 100).toFixed(2);
        
        // Show note if they have credit
        if (noteEl) {
          noteEl.style.display = balanceInPence > 0 ? 'block' : 'none';
        }
      } else {
        section.style.display = 'none';
      }
    }
    
    /**
     * Update page title with counsellor name
     */
    function updatePageTitleWithCounsellor() {
      const pageTitle = document.getElementById('pageTitle');
      const counsellorName = selectedCounsellor || sessionStorage.getItem('counsellorName');
      
      if (pageTitle && counsellorName) {
        pageTitle.textContent = 'Cherry Tree Centre - Room Booking Calendar - ' + counsellorName;
      }
    }
    
    // Set up real-time listener for credit balance changes
    function setupCreditBalanceListener() {
      const counsellorId = window.clientId;
      if (!counsellorId) return;
      
      database.ref('credits/' + counsellorId + '/balance').on('value', (snapshot) => {
        const balance = snapshot.val() || 0;
        window.counsellorCreditBalance = balance;
        updateCreditBalanceDisplay(balance);
        console.log('💳 Credit balance updated (real-time):', balance);
      });
    }


<!-- ================================ -->
<!-- SECTION 5.1.2: PAYMENT CHOICE MODAL -->
<!-- ================================ -->
    // Store pending payment details
    window.pendingPayment = null;
    
    /**
     * Show payment choice modal
     */
    function showPaymentChoiceModal(paymentDetails, isBasket = false) {
      const modal = document.getElementById('paymentChoiceModal');
      const summaryEl = document.getElementById('paymentChoiceSummary');
      const creditOption = document.getElementById('paymentOptionCredit');
      const cardOption = document.getElementById('paymentOptionCard');
      const partialOption = document.getElementById('paymentOptionPartial');
      const cardNote = document.getElementById('paymentOptionCardNote');
      const partialNote = document.getElementById('paymentOptionPartialNote');
      const statusEl = document.getElementById('paymentChoiceStatus');
      
      if (!modal) return;
      
      // Reset status
      if (statusEl) statusEl.style.display = 'none';
      
      // Store for later use
      window.pendingPayment = {
        ...paymentDetails,
        isBasket: isBasket
      };
      
      const total = paymentDetails.totalAmount || 0;
      const credit = window.counsellorCreditBalance || 0;
      const itemCount = isBasket ? paymentDetails.items?.length || 1 : 1;
      
      // Build summary HTML
      let summaryHtml = '';
      if (isBasket && paymentDetails.items) {
        summaryHtml = `
          <div style="font-weight: 600; margin-bottom: 10px;">📦 Basket Summary (${itemCount} booking${itemCount > 1 ? 's' : ''})</div>
          <div style="max-height: 150px; overflow-y: auto; margin-bottom: 10px;">
            ${paymentDetails.items.map(item => `
              <div style="font-size: 13px; padding: 5px 0; border-bottom: 1px solid #eee;">
                ${item.room} - ${item.formattedDate} at ${item.time} - £${(item.price / 100).toFixed(2)}
              </div>
            `).join('')}
          </div>
        `;
      } else {
        summaryHtml = `
          <div style="font-weight: 600; margin-bottom: 10px;">📅 Booking Summary</div>
          <div style="font-size: 14px;">
            <div>${paymentDetails.room}</div>
            <div>${paymentDetails.formattedDate} at ${paymentDetails.time}</div>
          </div>
        `;
      }
      
      summaryHtml += `
        <div style="border-top: 2px solid #ddd; margin-top: 15px; padding-top: 15px;">
          <div style="display: flex; justify-content: space-between; font-size: 16px;">
            <span>Total:</span>
            <span style="font-weight: bold;">£${(total / 100).toFixed(2)}</span>
          </div>
          ${credit > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 14px; color: #4caf50; margin-top: 5px;">
            <span>Your Credit:</span>
            <span>£${(credit / 100).toFixed(2)}</span>
          </div>
          ` : ''}
        </div>
      `;
      
      summaryEl.innerHTML = summaryHtml;
      
      // Show/hide options based on credit vs total
      if (credit >= total) {
        // Can pay fully with credit
        creditOption.style.display = 'block';
        cardOption.style.display = 'block';
        partialOption.style.display = 'none';
        cardNote.textContent = 'Or pay by card instead';
      } else if (credit > 0) {
        // Partial credit available
        creditOption.style.display = 'none';
        cardOption.style.display = 'block';
        partialOption.style.display = 'block';
        
        const remainder = total - credit;
        cardNote.textContent = 'Pay the full £' + (total / 100).toFixed(2) + ' by card';
        partialNote.textContent = 'Use £' + (credit / 100).toFixed(2) + ' credit, pay £' + (remainder / 100).toFixed(2) + ' by card';
      } else {
        // No credit
        creditOption.style.display = 'none';
        cardOption.style.display = 'block';
        partialOption.style.display = 'none';
        cardNote.textContent = 'Secure payment via Stripe';
      }
      
      // Show modal
      modal.style.display = 'flex';
    }
    
    function closePaymentChoiceModal() {
      const modal = document.getElementById('paymentChoiceModal');
      if (modal) modal.style.display = 'none';
      window.pendingPayment = null;
    }
    
    /**
     * Get the correct SBM service ID based on room name
     * Service ID 1 = Room bookings, Service ID 9 = Car Park
     */
    function getServiceIdForRoom(roomName) {
      if (!roomName) return '1';
      const room = roomName.toLowerCase().replace(/_/g, ' ');
      return (room === 'car park') ? '9' : '1';
    }
    
    /**
     * Convert payment details to standardized items array
     * This normalizes single bookings and baskets into the same format
     */
    function normalizeToItems(payment) {
      if (payment.isBasket && payment.items) {
        return payment.items.map(item => ({
          room_id: item.roomId,
          room_name: item.room,
          location_id: item.locationId,
          location_name: item.locationId === '2' ? 'Henley' : 'Buckhurst Hill',
          date: item.date,
          start_time: item.time,
          end_time: item.endTime,
          price: item.price,
          formatted_date: item.formattedDate,
          service_id: getServiceIdForRoom(item.room),
          comments: item.comments || null
        }));
      } else {
        // Single booking - convert to array with one item
        return [{
          room_id: payment.roomId,
          room_name: payment.room,
          location_id: payment.locationId,
          location_name: payment.locationId === '2' ? 'Henley' : 'Buckhurst Hill',
          date: payment.date,
          start_time: payment.time,
          end_time: payment.endTime,
          price: payment.totalAmount,
          formatted_date: payment.formattedDate,
          service_id: getServiceIdForRoom(payment.room),
          comments: payment.comments || null
        }];
      }
    }
    
    // =========================================
    // PAYMENT CHOICE HANDLERS
    // =========================================
    
    /**
     * Process payment using credit only
     */
    async function processPaymentWithCredit() {
      if (!window.pendingPayment) return;
      
      const statusEl = document.getElementById('paymentChoiceStatus');
      statusEl.style.display = 'block';
      statusEl.style.background = '#fff3cd';
      statusEl.style.color = '#856404';
      statusEl.textContent = 'Processing credit payment...';
      
      try {
        const items = normalizeToItems(window.pendingPayment);
        await processCreditPayments(items, window.pendingPayment.totalAmount);
        
        statusEl.style.background = '#d4edda';
        statusEl.style.color = '#155724';
        statusEl.textContent = 'âœ… Booking confirmed!';
        
        // Get the booking date to navigate to
        const bookingDate = window.pendingPayment?.date;
        
        setTimeout(() => {
          closePaymentChoiceModal();
          
          // Navigate to booking date before refresh
          if (bookingDate) {
            currentDate = bookingDate;
            const dateSelector = document.getElementById('dateSelector');
            if (dateSelector) dateSelector.value = bookingDate;
            currentWeekStart = getWeekStartDate(new Date(bookingDate + 'T12:00:00'));
          }
          
          if (typeof refreshData === 'function') refreshData();
        }, 2000);
        
      } catch (error) {
        console.error('Credit payment error:', error);
        statusEl.style.background = '#f8d7da';
        statusEl.style.color = '#721c24';
        statusEl.textContent = '⚠️ Error: ' + error.message;
      }
    }
    
    /**
     * Process payment with card only
     */
    async function processPaymentWithCard() {
      if (!window.pendingPayment) return;
      
      const statusEl = document.getElementById('paymentChoiceStatus');
      statusEl.style.display = 'block';
      statusEl.style.background = '#fff3cd';
      statusEl.style.color = '#856404';
      statusEl.textContent = 'Preparing Stripe checkout...';
      
      try {
        const items = normalizeToItems(window.pendingPayment);
        // No credit used - all items go to Stripe
        const stripeItems = items.map(item => ({
          ...item,
          credit_used: 0,
          stripe_amount: item.price
        }));
        await processStripePayment(stripeItems, 0);
        
      } catch (error) {
        console.error('Card payment error:', error);
        statusEl.style.background = '#f8d7da';
        statusEl.style.color = '#721c24';
        statusEl.textContent = '⚠️ Error: ' + error.message;
      }
    }
    
    /**
     * Process payment with partial credit + card
     */
    async function processPaymentWithPartialCredit() {
      if (!window.pendingPayment) return;
      
      const statusEl = document.getElementById('paymentChoiceStatus');
      statusEl.style.display = 'block';
      statusEl.style.background = '#fff3cd';
      statusEl.style.color = '#856404';
      statusEl.textContent = 'Processing payment...';
      
      try {
        const items = normalizeToItems(window.pendingPayment);
        await processMixedPayment(items);
        
      } catch (error) {
        console.error('Mixed payment error:', error);
        statusEl.style.background = '#f8d7da';
        statusEl.style.color = '#721c24';
        statusEl.textContent = '⚠️ Error: ' + error.message;
      }
    }
    
    // =========================================
    // CREDIT PAYMENT PROCESSING
    // =========================================
    
    /**
     * Process items with credit (sends individual webhooks)
     */
    async function processCreditPayments(items, totalAmount) {
      const webhookUrl = 'https://hook.eu2.make.com/a6ua2a1yl13y7h7k9aphi9iow53dvwpv';
      const counsellorName = selectedCounsellor || sessionStorage.getItem('counsellorName');
      const paymentGroupId = 'PG_' + Date.now();
      
      let successCount = 0;
      let failCount = 0;
      let newBalance = window.counsellorCreditBalance;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          const payload = {
            client_id: window.clientId,
            counsellor_id: window.henleyClientId,
            counsellor_name: counsellorName,
            room_id: item.room_id,
            room_name: item.room_name,
            service_id: item.service_id || getServiceIdForRoom(item.room_name),
            location_id: item.location_id,
            location_name: item.location_name,
            date: item.date,
            start_time: item.start_time,
            end_time: item.end_time,
            amount: item.price,
            credit_used: item.price,
            stripe_amount: 0,
            deduct_credit: true,
            payment_group_id: paymentGroupId,
            item_index: i + 1,
            item_count: items.length,
            source: 'calendar',
            timestamp: new Date().toISOString(),
            comments: item.comments || null
          };
          
          console.log(`💳 Credit payment ${i + 1}/${items.length}:`, payload);
          
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (response.ok) {
            const result = await response.json();
            successCount++;
            if (result.newBalance !== undefined) {
              newBalance = result.newBalance;
            }
          } else {
            failCount++;
            console.error('Credit webhook failed:', await response.text());
          }
        } catch (e) {
          console.error('Credit payment failed:', e);
          failCount++;
        }
      }
      
      // Clear basket
      window.bookingBasket = [];
      if (typeof updateBasketUI === 'function') updateBasketUI();
      
      // Update credit display
      window.counsellorCreditBalance = newBalance;
      updateCreditBalanceDisplay(newBalance);
      
      if (failCount > 0) {
        throw new Error(`${successCount} succeeded, ${failCount} failed`);
      }
    }
    
    // =========================================
    // STRIPE PAYMENT PROCESSING
    // =========================================
    
    /**
     * Process items with Stripe
     * Always saves to Firebase first, then creates Stripe checkout
     */
    async function processStripePayment(items, totalCreditUsed) {
      const counsellorName = selectedCounsellor || sessionStorage.getItem('counsellorName');
      const basketRef = 'PB_' + Date.now();
      const totalStripeAmount = items.reduce((sum, item) => sum + item.stripe_amount, 0);
      const totalAmount = items.reduce((sum, item) => sum + item.price, 0);
      
      // Save pending basket to Firebase
      const pendingBasket = {
        id: basketRef,
        client_id: window.clientId,
        counsellor_id: window.henleyClientId,
        counsellor_name: counsellorName,
        items: items,
        total_amount: totalAmount,
        total_credit_used: totalCreditUsed,
        total_stripe: totalStripeAmount,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      console.log('📦 Saving pending basket to Firebase:', pendingBasket);
      
      const firebaseUrl = `https://cherry-tree-bookings-default-rtdb.europe-west1.firebasedatabase.app/pending_baskets/${basketRef}.json`;
      const saveResponse = await fetch(firebaseUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingBasket)
      });
      
      if (!saveResponse.ok) {
        throw new Error('Could not save basket');
      }
      
      // Build description
      const itemDescriptions = items.slice(0, 3).map(item => 
        `${item.room_name} ${item.formatted_date || item.date}`
      ).join(', ');
      let description = items.length > 3 
        ? `${itemDescriptions} +${items.length - 3} more`
        : itemDescriptions;
      if (totalCreditUsed > 0) {
        description += ` [Credit: £${(totalCreditUsed/100).toFixed(2)}]`;
      }
      
      // Create Stripe checkout with basket reference only
      const checkoutPayload = {
        counsellor_name: counsellorName,
        counsellor_id: window.henleyClientId || '',
        client_id: window.clientId || '',
        amount: totalStripeAmount,
        credit_used: totalCreditUsed,
        description: `Room booking: ${description}`,
        basket_ref: basketRef,
        success_url: STRIPE_CONFIG.successUrl + '&basket=' + basketRef + '&date=' + (items[0]?.date || ''),
        cancel_url: STRIPE_CONFIG.cancelUrl
      };
      
      console.log('💳 Creating Stripe checkout:', checkoutPayload);
      
      const response = await fetch(STRIPE_CONFIG.createCheckoutWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload)
      });
      
      if (!response.ok) {
        throw new Error('Could not create checkout session');
      }
      
      const result = await response.json();
      
      if (result.checkout_url) {
        // Clear basket before redirect
        window.bookingBasket = [];
        if (typeof updateBasketUI === 'function') updateBasketUI();
        
        window.location.href = result.checkout_url;
      } else {
        throw new Error('No checkout URL returned');
      }
    }
    
    // =========================================
    // MIXED PAYMENT PROCESSING
    // =========================================
    
    /**
     * Process items with credit first, then Stripe for remainder
     */
    async function processMixedPayment(items) {
      const creditWebhookUrl = 'https://hook.eu2.make.com/a6ua2a1yl13y7h7k9aphi9iow53dvwpv';
      const counsellorName = selectedCounsellor || sessionStorage.getItem('counsellorName');
      const paymentGroupId = 'PG_' + Date.now();
      const statusEl = document.getElementById('paymentChoiceStatus');
      
      let remainingCredit = window.counsellorCreditBalance || 0;
      const creditItems = [];   // Fully covered by credit
      const stripeItems = [];   // Need some or all from Stripe
      
      // Allocate credit to items in order
      for (const item of items) {
        if (remainingCredit >= item.price) {
          // Fully covered by credit
          creditItems.push({
            ...item,
            credit_used: item.price,
            stripe_amount: 0
          });
          remainingCredit -= item.price;
        } else {
          // Partially or not covered by credit
          stripeItems.push({
            ...item,
            credit_used: remainingCredit,
            stripe_amount: item.price - remainingCredit
          });
          remainingCredit = 0;
        }
      }
      
      console.log('📦 Mixed payment split:', {
        creditItems: creditItems.length,
        stripeItems: stripeItems.length,
        originalCredit: window.counsellorCreditBalance
      });
      
      let newBalance = window.counsellorCreditBalance;
      
      // Process credit-only items immediately
      if (creditItems.length > 0) {
        statusEl.textContent = `Processing ${creditItems.length} booking(s) with credit...`;
        
        for (let i = 0; i < creditItems.length; i++) {
          const item = creditItems[i];
          try {
            const payload = {
              client_id: window.clientId,
              counsellor_id: window.henleyClientId,
              counsellor_name: counsellorName,
              room_id: item.room_id,
              room_name: item.room_name,
              service_id: item.service_id || getServiceIdForRoom(item.room_name),
              location_id: item.location_id,
              location_name: item.location_name,
              date: item.date,
              start_time: item.start_time,
              end_time: item.end_time,
              amount: item.price,
              credit_used: item.credit_used,
              stripe_amount: 0,
              deduct_credit: true,
              payment_group_id: paymentGroupId,
              item_index: i + 1,
              item_count: items.length,
              source: 'calendar',
              timestamp: new Date().toISOString(),
              comments: item.comments || null
            };
            
            console.log(`💳 Credit payment ${i + 1}/${creditItems.length}:`, payload);
            
            const response = await fetch(creditWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            
            if (response.ok) {
              const result = await response.json();
              if (result.newBalance !== undefined) {
                newBalance = result.newBalance;
              }
            }
          } catch (e) {
            console.error('Credit item failed:', e);
          }
        }
        
        // Update credit display
        window.counsellorCreditBalance = newBalance;
        updateCreditBalanceDisplay(newBalance);
      }
      
      // Process Stripe items
      if (stripeItems.length > 0) {
        statusEl.textContent = 'Preparing card payment...';
        
        const totalCreditUsed = stripeItems.reduce((sum, item) => sum + item.credit_used, 0);
        
        // Add payment_group_id to stripe items for linking
        const stripeItemsWithGroup = stripeItems.map(item => ({
          ...item,
          payment_group_id: paymentGroupId
        }));
        
        await processStripePayment(stripeItemsWithGroup, totalCreditUsed);
      } else {
        // All items covered by credit
        window.bookingBasket = [];
        if (typeof updateBasketUI === 'function') updateBasketUI();
        
        statusEl.style.background = '#d4edda';
        statusEl.style.color = '#155724';
        statusEl.textContent = 'âœ… All bookings confirmed!';
        
        setTimeout(() => {
          closePaymentChoiceModal();
          if (typeof refreshData === 'function') refreshData();
        }, 2000);
      }
    }

