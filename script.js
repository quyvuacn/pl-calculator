// Function to evaluate mathematical expressions safely (only + and -)
function evaluateExpression(expression) {
  try {
    // Only allow numbers, +, -, and spaces
    const cleanExpression = expression.replace(/[^0-9+\-.\s]/g, "");

    // Basic validation - only allow numbers and + or -
    if (!/^[0-9+\-.\s]+$/.test(cleanExpression)) {
      return null;
    }

    // Use Function constructor to safely evaluate the expression
    const result = new Function("return " + cleanExpression)();

    // Check if result is a valid number
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Function to process input and update the field value
function processInput(inputElement, originalValue) {
  const inputValue = inputElement.value.trim();

  // If input contains + or - operators, try to evaluate
  if (/[+\-]/.test(inputValue)) {
    const result = evaluateExpression(inputValue);
    if (result !== null && result > 0) {
      inputElement.value = result;
      return result;
    } else {
      // If evaluation fails, extract number from input
      const numberMatch = inputValue.match(/[\d.]+/);
      if (numberMatch) {
        const numberValue = parseFloat(numberMatch[0]);
        if (!isNaN(numberValue) && numberValue > 0) {
          inputElement.value = numberValue;
          return numberValue;
        }
      }
      // If no valid number found, revert to original value
      inputElement.value = originalValue;
      return originalValue;
    }
  }

  // If no operators, return the parsed number
  const parsedValue = parseFloat(inputValue);
  return isNaN(parsedValue) ? originalValue : parsedValue;
}

// Function to calculate Take Profit and Stop Loss based on 6% max loss including fees
function calculateTakeProfitAndStopLoss(
  entryPrice,
  capital,
  leverage,
  feeType
) {
  if (entryPrice <= 0 || capital <= 0 || leverage <= 0) {
    return { takeProfit: entryPrice, stopLoss: entryPrice };
  }

  // Calculate Stop Loss based on 6% of capital (vốn ban đầu) including fees
  const maxLossAmount = capital * 0.06; // 6% of capital (vốn ban đầu) including fees
  const positionSize = capital * leverage;

  // Get current fee rate
  const feeRate = BYBIT_FEES[feeType] / 100; // Convert to decimal
  const totalFeeRate = feeRate * 2; // Entry + Exit fees

  // Calculate fees for the position
  const totalFees = positionSize * totalFeeRate;

  // Calculate price change needed to lose 6% of capital (including fees)
  const netLossAmount = maxLossAmount - totalFees; // Loss amount excluding fees
  const priceChangeForLoss = (netLossAmount / positionSize) * entryPrice;
  const stopLoss = Math.round((entryPrice - priceChangeForLoss) * 100) / 100;

  // Calculate Take Profit for 1:2 R:R (2x the loss amount)
  const priceChangeForProfit = priceChangeForLoss * 2;
  const takeProfit =
    Math.round((entryPrice + priceChangeForProfit) * 100) / 100;

  return { takeProfit, stopLoss };
}

// DOM Elements
const calculateBtn = document.getElementById("calculateBtn");
const leverageInput = document.getElementById("leverage");
const leverageValueEl = document.getElementById("leverageValue");
const positionTypeSelect = document.getElementById("positionType");
const entryPriceInput = document.getElementById("entryPrice");
const capitalInput = document.getElementById("capital");
const feeTypeSelect = document.getElementById("feeType");
const takeProfitInput = document.getElementById("takeProfit");
const stopLossInput = document.getElementById("stopLoss");

// Result elements
const entryFeeEl = document.getElementById("entryFee");
const exitFeeEl = document.getElementById("exitFee");
const profitPriceChangeEl = document.getElementById("profitPriceChange");
const totalFeesEl = document.getElementById("totalFees");
const profitPnLEl = document.getElementById("profitPnL");
const profitRoiEl = document.getElementById("profitRoi");

// Loss column elements
const lossPriceChangeEl = document.getElementById("lossPriceChange");
const lossPnLEl = document.getElementById("lossPnL");
const lossRoiEl = document.getElementById("lossRoi");

// Event Listeners
// Auto-calculate when inputs change (except Take Profit and Stop Loss)
[leverageInput, entryPriceInput, capitalInput].forEach((input) => {
  input.addEventListener("input", calculatePnL);
});

// Update leverage value display when slider moves
leverageInput.addEventListener("input", function () {
  leverageValueEl.textContent = this.value;

  // Also update Take Profit and Stop Loss when leverage changes
  const entryPrice = parseFloat(entryPriceInput.value) || 0;
  const capital = parseFloat(capitalInput.value) || 0;
  const leverage = parseFloat(this.value) || 1;

  if (entryPrice > 0 && capital > 0) {
    const feeType = feeTypeSelect.value;
    const { takeProfit, stopLoss } = calculateTakeProfitAndStopLoss(
      entryPrice,
      capital,
      leverage,
      feeType
    );
    takeProfitInput.value = takeProfit;
    stopLossInput.value = stopLoss;
  }
});

// Update Take Profit and Stop Loss when Entry Price changes
entryPriceInput.addEventListener("input", function () {
  const newEntryPrice = parseFloat(this.value) || 0;
  const capital = parseFloat(capitalInput.value) || 0;
  const leverage = parseFloat(leverageInput.value) || 1;

  if (newEntryPrice > 0 && capital > 0) {
    const feeType = feeTypeSelect.value;
    const { takeProfit, stopLoss } = calculateTakeProfitAndStopLoss(
      newEntryPrice,
      capital,
      leverage,
      feeType
    );
    takeProfitInput.value = takeProfit;
    stopLossInput.value = stopLoss;
  }
  calculatePnL(); // Recalculate with new values
});

// Update Take Profit and Stop Loss when Capital changes
capitalInput.addEventListener("input", function () {
  const entryPrice = parseFloat(entryPriceInput.value) || 0;
  const capital = parseFloat(this.value) || 0;
  const leverage = parseFloat(leverageInput.value) || 1;

  if (entryPrice > 0 && capital > 0) {
    const feeType = feeTypeSelect.value;
    const { takeProfit, stopLoss } = calculateTakeProfitAndStopLoss(
      entryPrice,
      capital,
      leverage,
      feeType
    );
    takeProfitInput.value = takeProfit;
    stopLossInput.value = stopLoss;
  }
  calculatePnL(); // Recalculate with new values
});

// Update calculations when position type changes
positionTypeSelect.addEventListener("change", calculatePnL);

// Update Take Profit and Stop Loss when Fee Type changes
feeTypeSelect.addEventListener("change", function () {
  const entryPrice = parseFloat(entryPriceInput.value) || 0;
  const capital = parseFloat(capitalInput.value) || 0;
  const leverage = parseFloat(leverageInput.value) || 1;

  if (entryPrice > 0 && capital > 0) {
    const feeType = this.value;
    const { takeProfit, stopLoss } = calculateTakeProfitAndStopLoss(
      entryPrice,
      capital,
      leverage,
      feeType
    );
    takeProfitInput.value = takeProfit;
    stopLossInput.value = stopLoss;
  }
  calculatePnL(); // Recalculate with new fee
});

// Add event listeners for Take Profit and Stop Loss to handle mathematical expressions
takeProfitInput.addEventListener("blur", function () {
  const originalValue = parseFloat(this.value) || 0;
  const processedValue = processInput(this, originalValue);
  calculatePnL(); // Recalculate after processing
});

stopLossInput.addEventListener("blur", function () {
  const originalValue = parseFloat(this.value) || 0;
  const processedValue = processInput(this, originalValue);
  calculatePnL(); // Recalculate after processing
});

// Handle Enter key press for immediate calculation
takeProfitInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    const originalValue = parseFloat(this.value) || 0;
    const processedValue = processInput(this, originalValue);
    calculatePnL();
    this.blur(); // Remove focus
  }
});

stopLossInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    const originalValue = parseFloat(this.value) || 0;
    const processedValue = processInput(this, originalValue);
    calculatePnL();
    this.blur(); // Remove focus
  }
});

// Handle input event for Take Profit and Stop Loss (but don't calculate immediately)
takeProfitInput.addEventListener("input", function () {
  // Just update the display, don't calculate yet
  // This allows typing mathematical expressions without interruption
});

stopLossInput.addEventListener("input", function () {
  // Just update the display, don't calculate yet
  // This allows typing mathematical expressions without interruption
});

// Fee rates based on Bybit Inverse Perpetual & Futures Contract (as of 2024)
const BYBIT_FEES = {
  taker: 0.055, // 0.055% Open Taker - Close Taker
  openMakerCloseTaker: 0.0375, // 0.0375% Open Maker - Close Taker
  maker: 0.02, // 0.02% Open Maker - Close Maker
};

// Main calculation function
function calculatePnL() {
  try {
    // Get input values
    const leverage = parseFloat(leverageInput.value) || 0;
    const positionType = positionTypeSelect.value;
    const entryPrice = parseFloat(entryPriceInput.value) || 0;
    const capital = parseFloat(capitalInput.value) || 0;

    // Process Take Profit and Stop Loss inputs to handle mathematical expressions
    const takeProfit = processInput(
      takeProfitInput,
      parseFloat(takeProfitInput.value) || 0
    );
    const stopLoss = processInput(
      stopLossInput,
      parseFloat(stopLossInput.value) || 0
    );

    const feeType = feeTypeSelect.value;
    const feeRate = BYBIT_FEES[feeType];

    // Validate inputs
    if (
      leverage <= 0 ||
      entryPrice <= 0 ||
      capital <= 0 ||
      takeProfit <= 0 ||
      stopLoss <= 0
    ) {
      clearResults();
      return;
    }

    // Calculate position size
    const positionSize = Math.round(capital * leverage * 100) / 100;

    // Calculate fees (convert percentage to decimal)
    const feeRateDecimal = feeRate / 100;
    const entryFee = Math.round(positionSize * feeRateDecimal * 100) / 100;
    const exitFee = Math.round(positionSize * feeRateDecimal * 100) / 100;
    const totalFees = Math.round((entryFee + exitFee) * 100) / 100;

    // Calculate P&L for both scenarios
    let profitPriceChange,
      profitPriceChangePercent,
      profitPnL,
      profitRoi,
      profitLeveragedRoi;
    let lossPriceChange,
      lossPriceChangePercent,
      lossPnL,
      lossRoi,
      lossLeveragedRoi;

    if (positionType === "long") {
      // Long position calculations
      // Profit scenario (Take Profit - price goes up)
      profitPriceChange = takeProfit - entryPrice;
      profitPriceChangePercent =
        Math.round((profitPriceChange / entryPrice) * 100 * 100) / 100;
      // For long: profit when price goes up
      const profitGrossPnL =
        Math.round(
          capital * leverage * (profitPriceChange / entryPrice) * 100
        ) / 100;
      profitPnL = Math.round((profitGrossPnL - totalFees) * 100) / 100;

      // Loss scenario (Stop Loss - price goes down)
      lossPriceChange = stopLoss - entryPrice;
      lossPriceChangePercent =
        Math.round((lossPriceChange / entryPrice) * 100 * 100) / 100;
      // For long: loss when price goes down
      const lossGrossPnL =
        Math.round(capital * leverage * (lossPriceChange / entryPrice) * 100) /
        100;
      lossPnL = Math.round((lossGrossPnL - totalFees) * 100) / 100; // SUBTRACT fees from loss
    } else {
      // Short position calculations
      // Profit scenario (Take Profit - price goes down)
      profitPriceChange = entryPrice - takeProfit;
      profitPriceChangePercent =
        Math.round((profitPriceChange / entryPrice) * 100 * 100) / 100;
      // For short: profit when price goes down
      const profitGrossPnL =
        Math.round(
          capital * leverage * (profitPriceChange / entryPrice) * 100
        ) / 100;
      profitPnL = Math.round((profitGrossPnL - totalFees) * 100) / 100;

      // Loss scenario (Stop Loss - price goes up)
      lossPriceChange = entryPrice - stopLoss;
      lossPriceChangePercent =
        Math.round((lossPriceChange / entryPrice) * 100 * 100) / 100;
      // For short: loss when price goes up
      const lossGrossPnL =
        Math.round(capital * leverage * (lossPriceChange / entryPrice) * 100) /
        100;
      lossPnL = Math.round((lossGrossPnL - totalFees) * 100) / 100; // SUBTRACT fees from loss
    }

    // Calculate ROI for both scenarios
    profitRoi = Math.round((profitPnL / capital) * 100 * 100) / 100;
    profitLeveragedRoi = Math.round(profitRoi * leverage * 100) / 100;

    lossRoi = Math.round((lossPnL / capital) * 100 * 100) / 100;
    lossLeveragedRoi = Math.round(lossRoi * leverage * 100) / 100;

    // Update UI with results
    updateResults({
      positionSize,
      entryFee,
      exitFee,
      totalFees,
      profitPriceChange,
      profitPriceChangePercent,
      profitPnL,
      profitRoi,
      profitLeveragedRoi,
      lossPriceChange,
      lossPriceChangePercent,
      lossPnL,
      lossRoi,
      lossLeveragedRoi,
      positionType,
    });
  } catch (error) {
    console.error("Calculation error:", error);
    clearResults();
  }
}

// Update results in the UI
function updateResults(results) {
  // Update Profit Column (Take Profit scenario)
  entryFeeEl.textContent = formatCurrency(results.entryFee);
  exitFeeEl.textContent = formatCurrency(results.exitFee);

  // Format price change for profit scenario
  const profitPriceChangeFormatted = formatCurrency(results.profitPriceChange);
  const profitPriceChangePercentFormatted = formatPercentage(
    results.profitPriceChangePercent
  );
  profitPriceChangeEl.textContent = `${profitPriceChangeFormatted} (${profitPriceChangePercentFormatted})`;

  totalFeesEl.textContent = formatCurrency(results.totalFees);
  profitPnLEl.textContent = formatCurrency(results.profitPnL);
  profitRoiEl.textContent = formatPercentage(results.profitRoi);

  // Update Loss Column (Stop Loss scenario)
  // Format price change for loss scenario
  const lossPriceChangeFormatted = formatCurrency(results.lossPriceChange);
  const lossPriceChangePercentFormatted = formatPercentage(
    results.lossPriceChangePercent
  );
  lossPriceChangeEl.textContent = `${lossPriceChangeFormatted} (${lossPriceChangePercentFormatted})`;

  lossPnLEl.textContent = formatCurrency(results.lossPnL);

  // Update ROI for loss scenario
  lossRoiEl.textContent = formatPercentage(results.lossRoi);

  // Reset all colors first
  profitPnLEl.style.color = "";
  profitRoiEl.style.color = "";
  lossPnLEl.style.color = "";
  lossRoiEl.style.color = "";
  profitPriceChangeEl.style.color = "";
  lossPriceChangeEl.style.color = "";

  // Add color coding for price changes based on actual values
  if (results.profitPriceChange >= 0) {
    profitPriceChangeEl.style.color = "#28a745"; // Green for positive change
  } else {
    profitPriceChangeEl.style.color = "#dc3545"; // Red for negative change
  }

  if (results.lossPriceChange >= 0) {
    lossPriceChangeEl.style.color = "#28a745"; // Green for positive change
  } else {
    lossPriceChangeEl.style.color = "#dc3545"; // Red for negative change
  }
}

// Clear all results
function clearResults() {
  const profitElements = [profitPriceChangeEl, profitPnLEl, profitRoiEl];

  const lossElements = [lossPriceChangeEl, lossPnLEl, lossRoiEl];

  const feeElements = [entryFeeEl, exitFeeEl, totalFeesEl];

  [...profitElements, ...lossElements, ...feeElements].forEach((el) => {
    el.textContent = "-";
    el.style.color = "";
  });
}

// Format currency values
function formatCurrency(value) {
  if (isNaN(value) || !isFinite(value)) return "-";

  // For very small values, use scientific notation
  if (Math.abs(value) < 0.01 && value !== 0) {
    return value.toExponential(4);
  }

  // For regular values, use USD format with exactly 2 decimal places
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format percentage values
function formatPercentage(value) {
  if (isNaN(value) || !isFinite(value)) return "-";

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

// Initialize calculator with default values
document.addEventListener("DOMContentLoaded", function () {
  // Set some realistic default values
  leverageInput.value = 4;
  leverageValueEl.textContent = "4";
  entryPriceInput.value = 50000;
  capitalInput.value = 400; // $400 USD

  // Calculate Take Profit and Stop Loss based on 6% of capital including fees (1:2 R:R)
  const entryPrice = parseFloat(entryPriceInput.value);
  const capital = parseFloat(capitalInput.value);
  const leverage = parseFloat(leverageInput.value);
  const feeType = feeTypeSelect.value;

  const { takeProfit, stopLoss } = calculateTakeProfitAndStopLoss(
    entryPrice,
    capital,
    leverage,
    feeType
  );

  takeProfitInput.value = takeProfit;
  stopLossInput.value = stopLoss;

  // Set initial values
  positionTypeSelect.value = "long"; // Default to long position
  feeTypeSelect.value = "openMakerCloseTaker"; // Default to open maker, close taker

  // Calculate initial results
  calculatePnL();
});

// Add some helpful tooltips and validation
function addInputValidation() {
  // Leverage validation (slider already limits to 1-100)
  leverageInput.addEventListener("change", function () {
    const value = parseInt(this.value);
    if (value < 1) {
      this.value = 1;
      leverageValueEl.textContent = "1";
    } else if (value > 100) {
      this.value = 100;
      leverageValueEl.textContent = "100";
    }
  });

  // Price validation
  entryPriceInput.addEventListener("blur", function () {
    const value = parseFloat(this.value);
    if (value <= 0) {
      this.value = 0.01;
      alert("Giá vào lệnh phải lớn hơn 0.");
    }
  });

  takeProfitInput.addEventListener("blur", function () {
    const value = parseFloat(this.value);
    if (value <= 0) {
      this.value = 0.01;
      alert("Take Profit phải lớn hơn 0.");
    }
  });

  stopLossInput.addEventListener("blur", function () {
    const value = parseFloat(this.value);
    if (value <= 0) {
      this.value = 0.01;
      alert("Stop Loss phải lớn hơn 0.");
    }
  });
}

// Initialize validation
addInputValidation();
