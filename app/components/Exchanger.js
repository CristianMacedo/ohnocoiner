import React from "react";

import PropTypes from "prop-types";

import {
  fetchSupportedCurrencies,
  fetchHistoricalPrice,
  fetchCurrentPrice,
} from "utils/api";
import date from "utils/date";

import { API_FIRST_DATE, API_START_DATE } from "../config/constants";

date.use();

const INITAL_RATES = {
  USD: {
    BTC: {},
  },
};

/**
 * Exchanger logic processor. Passes data through render props to input/output.
 */
export default function Exchanger({ input, output }) {
  const [supportedCurrencies, setSupportedCurrencies] = React.useState([]);
  const [timestamp, setTimestamp] = React.useState();
  const [inputCurrency, setInputCurrency] = React.useState("USD");
  const [inputCurrencyValue, setInputCurrencyValue] = React.useState(0);
  const [outputCurrency] = React.useState("BTC");
  const [outputCurrencyValue, setOutputCurrencyValue] = React.useState(0);
  const [rates, setRates] = React.useState({ ...INITAL_RATES });
  const [selectedDate, setSelectedDate] = React.useState(API_START_DATE);

  const today = React.useMemo(() => new Date().toSimple(), []);
  const isLoading = React.useMemo(
    () => !(selectedDate in rates[inputCurrency][outputCurrency]),
    [inputCurrency, outputCurrency, rates, selectedDate]
  );

  const updateSupportedCurrencies = React.useCallback(async () => {
    const newSupportedCurrencies = await fetchSupportedCurrencies();
    setSupportedCurrencies(newSupportedCurrencies);
  }, []);

  const updateRates = React.useCallback(
    async (newSelectedDate, newInputCurrency, newOutputCurrency) => {
      let selectedDateRate =
        rates[newInputCurrency][newOutputCurrency][newSelectedDate];
      const dateExists =
        newSelectedDate in rates[newInputCurrency][newOutputCurrency];

      if (!dateExists) {
        const selectedDateRateData = await fetchHistoricalPrice(
          newSelectedDate,
          newInputCurrency,
          newOutputCurrency
        );
        selectedDateRate = selectedDateRateData.bpi[newSelectedDate];
      }

      const todayRateData = await fetchCurrentPrice(newInputCurrency);
      const todayRate = todayRateData.bpi[newInputCurrency].rate_float;
      const newTimestamp = todayRateData.time.updated;

      const newRates = {
        ...rates,
        [newInputCurrency]: {
          ...rates[newInputCurrency],
          [newOutputCurrency]: {
            ...rates[newInputCurrency][newOutputCurrency],
            [newSelectedDate]: selectedDateRate,
            [today]: todayRate,
          },
        },
      };

      setRates(newRates);
      setTimestamp(newTimestamp);

      setOutputCurrencyValue(
        inputCurrencyValue /
          newRates[newInputCurrency][newOutputCurrency][newSelectedDate]
      );
    },
    [inputCurrencyValue, rates, today]
  );

  const handleSelectedDateChange = React.useCallback(
    (newSelectedDate) => {
      setSelectedDate(newSelectedDate);
      updateRates(newSelectedDate, inputCurrency, outputCurrency);
    },
    [inputCurrency, outputCurrency, updateRates]
  );

  const handleInputCurrencyChange = React.useCallback(
    (newInputCurrency) => {
      setInputCurrency(newInputCurrency);
      updateRates(selectedDate, newInputCurrency, outputCurrency);
    },
    [outputCurrency, selectedDate, updateRates]
  );

  const handleInputCurrencyValueChange = React.useCallback(
    (newInputCurrencyValue) => {
      setInputCurrencyValue(newInputCurrencyValue);
      setOutputCurrencyValue(
        newInputCurrencyValue /
          rates[inputCurrency][outputCurrency][selectedDate]
      );
    },
    [inputCurrency, outputCurrency, rates, selectedDate]
  );

  const handleOutputCurrencyValueChange = React.useCallback(
    (newOutputCurrencyValue) => {
      setOutputCurrencyValue(newOutputCurrencyValue);
      setInputCurrencyValue(
        newOutputCurrencyValue *
          rates[inputCurrency][outputCurrency][selectedDate]
      );
    },
    [inputCurrency, outputCurrency, rates, selectedDate]
  );

  React.useEffect(() => {
    updateSupportedCurrencies();
    updateRates(selectedDate, inputCurrency, outputCurrency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputCurrency, outputCurrency, selectedDate]);

  return (
    <>
      {input({
        cashValue: inputCurrencyValue,
        cashCode: inputCurrency,
        cryptoValue: outputCurrencyValue,
        cryptoCode: outputCurrency,
        supportedCash: supportedCurrencies,
        historicalDate: selectedDate,
        minDate: API_FIRST_DATE,
        maxDate: today,
        onCurrencyChange: handleInputCurrencyChange,
        onCashChange: handleInputCurrencyValueChange,
        onCryptoChange: handleOutputCurrencyValueChange,
        onHistoricalChange: handleSelectedDateChange,
      })}
      {output({
        cashCode: inputCurrency,
        timestamp,
        result:
          outputCurrencyValue * rates[inputCurrency][outputCurrency][today],
        isLoading,
      })}
    </>
  );
}

Exchanger.propTypes = {
  input: PropTypes.func.isRequired,
  output: PropTypes.func.isRequired,
};
