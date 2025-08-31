document.addEventListener('DOMContentLoaded', function() {
    // Get input elements
    const debtInput = document.getElementById('debt');
    const interestInput = document.getElementById('interest');
    const yearsInput = document.getElementById('years');
    
    // Get output elements
    const monthlyPaymentOutput = document.getElementById('monthly-payment');
    const totalPaymentOutput = document.getElementById('total-payment');
    
    // Add input event listeners
    debtInput.addEventListener('input', formatNumber);
    debtInput.addEventListener('input', calculateMortgage);
    interestInput.addEventListener('input', formatNumber);
    interestInput.addEventListener('input', calculateMortgage);
    yearsInput.addEventListener('input', formatNumber);
    yearsInput.addEventListener('input', calculateMortgage);
    
    // Format number with thousand separator
    function formatNumber(e) {
        // Get input value and remove all spaces
        let value = e.target.value.replace(/\s/g, '');
        
        // Check if the value is a valid number
        if (!/^\d*\.?\d*$/.test(value)) {
            // If not valid, remove last character and try again
            value = value.slice(0, -1);
        }
        
        // Format with thousand separator (space)
        const formattedValue = value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        
        // Update input value if it's different
        if (e.target.value !== formattedValue) {
            e.target.value = formattedValue;
        }
    }
    
    // Calculate mortgage
    function calculateMortgage() {
        // Get values from inputs and parse them
        const debt = parseFloat(debtInput.value.replace(/\s/g, '') || 0);
        const interest = parseFloat(interestInput.value.replace(/\s/g, '') || 0) / 100 / 12; // Monthly interest rate
        const years = parseInt(yearsInput.value.replace(/\s/g, '') || 0);
        const months = years * 12;
        
        // Calculate monthly payment
        let monthlyPayment = 0;
        let totalPayment = 0;
        
        if (debt > 0 && interest > 0 && months > 0) {
            monthlyPayment = debt * interest * Math.pow(1 + interest, months) / (Math.pow(1 + interest, months) - 1);
            totalPayment = monthlyPayment * months;
        }
        
        // Format and display results
        monthlyPaymentOutput.textContent = '$' + formatCurrency(monthlyPayment);
        totalPaymentOutput.textContent = '$' + formatCurrency(totalPayment);
    }
    
    // Format currency with thousand separator and 2 decimal places
    function formatCurrency(value) {
        return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
});
