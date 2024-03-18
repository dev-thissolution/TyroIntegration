import * as React from 'react';
import { createRef, useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const defaultSettings = {
  paySecret: '',
  theme: 'default',
  styleProps: {
    bodyBackgroundColor: '#fff',
  },
  options: {
    applePay: {
      enabled: true,
    },
    googlePay: {
      enabled: false
    },
  },
};

const tyroJSRef = createRef();

const App = () => {
  const [configuration, setConfiguration] = useState(defaultSettings);

  const [error, setError] = useState({});
  const [loading, setLoading] = useState(false);
  const [libraryReady, setLibraryReady] = useState(false);
  const [fetchingPaySecret, setFetchingPaySecret] = useState(false);
  const [payRequestReady, setPayRequestReady] = useState(false);
  const [payFormReady, setPayFormReady] = useState(false);
  const [submittingOverlay, setSubmittingOverlay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payComplete, setPayComplete] = useState(false);
  const [buttonStyle, setButtonStyle] = useState({
    borderRadius: '5px',
    width: '100%',
    backgroundColor: '#F3C910',
    border: '0px',
    color: 'white',
    padding: '10px',
    marginTop: '10px',
    fontSize: '20px',
  });

  const { paySecret, theme, styleProps, options } = configuration;
  let search = window.location.search;
  let params = new URLSearchParams(search);
  let paySecretValue = params.get('paySecretValue');
  let buttonBorderRadius = params.get('buttonBorderRadius');
  let buttonBackgroundColor = params.get('buttonBackgroundColor');

  // STEP 1, Attach TyroJS Library
  // Installs the TyroJS Library onto the DOM
  useEffect(() => {
    const script = document.createElement('script');
    script.id = 'tyro-js-library';
    script.src = 'https://pay.connect.tyro.com/v1/tyro.js';
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => setLibraryReady(true);
    document.body.appendChild(script);

    if (buttonBorderRadius) {
      setButtonStyle(prevStyle => ({
        ...prevStyle,
        borderRadius: buttonBorderRadius + 'px'
      }));
    }

    // Update buttonStyle if buttonBackgroundColor exists
    if (buttonBackgroundColor) {
      setButtonStyle(prevStyle => ({
        ...prevStyle,
        backgroundColor: '#' + buttonBackgroundColor
      }));
    }

    setLoading(true);
  }, []);



  // STEP 2, Fetch the Pay Secret
  useEffect(() => {
    setError({});
    if (!paySecret?.length && !fetchingPaySecret) {
      setConfiguration({
        ...configuration,
        paySecret: paySecretValue,
      });
      //fetchPaySecret();
    }
  }, [paySecret]);

  // STEP 3, Load the Pay Request into TyroJS
  useEffect(() => {
    if (libraryReady && paySecret?.length) {
      initPayRequest();
    }
  }, [
    libraryReady,
    paySecret,
  ]);

  // Initialize Tyro.js with the Pay Request
  async function initPayRequest() {
    setLoading(true);
    setPayRequestReady(false);
    setPayFormReady(false);
    setSubmitting(false);
    try {
      // @ts-ignore
      /* eslint-disable no-undef */
      tyroJSRef.current.tyroJSInstance = Tyro({
        liveMode: false, // TODO:: need to set true for production only.
      });
      await tyroJSRef.current.tyroJSInstance.init(paySecret);
      const payFormElement = document.getElementById('tyro-pay-form');
      if (payFormElement !== null) {
        payFormElement.innerHTML = '';
      }
      setPayRequestReady(true);
    } catch (error) {
      toast.error(error.toString());
      setLoading(false);
    }
  }

  // STEP 4, Embed the Pay Form into your Document
  useEffect(() => {
    if (libraryReady && payRequestReady && !payFormReady) {
      initPayForm();
    }
  }, [payRequestReady]);

  // Initialize the Pay Form
  async function initPayForm() {
    setPayFormReady(false);
    setSubmitting(false);
    try {
      const payFormElement = document.getElementById('tyro-pay-form');
      if (payFormElement === null) {
        throw new Error(`Pay Form is not mounted`);
      }
      payFormElement.innerHTML = '';
      const payForm = tyroJSRef.current.tyroJSInstance.createPayForm({
        theme,
        styleProps,
        options,
      });
      // Attach the Wallet Listeners to the form
      payForm.setWalletPaymentBeginListener((paymentType) => {
        setSubmittingOverlay(true);
        if (paymentType === 'APPLE_PAY') {
          // optionally do something specific to Apple Pay
        } else if (paymentType === 'GOOGLE_PAY') {
          // optionally do something specific to Google Pay
        }
      });
      payForm.setWalletPaymentCancelledListener((paymentType) => {
        setSubmittingOverlay(false);
        if (paymentType === 'APPLE_PAY') {
          // optionally do something specific to Apple Pay
        } else if (paymentType === 'GOOGLE_PAY') {
          // optionally do something specific to Google Pay
        }
      });
      payForm.setWalletPaymentCompleteListener((paymentType, error) => {
        if (error) {
          toast.error(error.toString());
          setSubmittingOverlay(false);
        } else {
          getPaymentResult();
        }
      });
      payForm.inject('#tyro-pay-form');
      setPayFormReady(true);
      setLoading(false);
    } catch (error) {
      toast.error(error.toString())
      setLoading(false);
    }
  }

  // STEP 5, Handle submitting the payment
  async function submitPayForm() {
    setError({});
    setSubmitting(true);
    setLoading(true);
    let result;
    try {
      result = await tyroJSRef.current.tyroJSInstance.submitPay();
      await getPaymentResult();

    } catch (error) {
      if (error?.type === 'CLIENT_VALIDATION_ERROR' && !error?.errorCode) {
        // can ignore these errors as handled by validation
      } else {
        toast.error(error.toString())
      }
      setSubmitting(false);
      setLoading(false);
    }
  }

  // Used to fetch the Pay Request Response
  async function getPaymentResult() {
    const payRequest = await tyroJSRef.current.tyroJSInstance.fetchPayRequest();
    // display result
    if (payRequest.status === 'SUCCESS') {
      window.ReactNativeWebView.postMessage(true);
    } else {
      toast.error(error.toString())
      setLoading(false);
    }
    setSubmittingOverlay(false);

  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingTop: '15px' }}>
      <div ref={tyroJSRef}>
        {error.type ? (
          <div className={'error-container'}>
            <p>({error.errorCode ?? 'UNKNOWN_ERROR'}) {error.message}</p>
          </div>
        ) : null}
        <>
          <form id="pay-form">
            <div id="pay-form-submitting-overlay" style={{ display: submittingOverlay ? 'block' : 'none', position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.5)' }}>
              ... Submitting ...
            </div>
            <div id="tyro-pay-form" style={{ visibility: payRequestReady ? 'visible' : 'hidden' }}></div>
            {/* <LoadingButton type='submit' disabled={submitting} onClick={submitPayForm} loading={submitting} variant="contained" loadingPosition="start" style={{ visibility: payRequestReady ? 'visible' : 'hidden', borderRadius: '10px', width: '100%', backgroundColor: '#9E8CCC', border: '0px', color: 'white', padding: '10px', marginTop: '10px' }}  >Enter card details</LoadingButton> */}
            <button id="pay-form-submit" onClick={submitPayForm} style={{
              ...buttonStyle,
              visibility: payRequestReady ? 'visible' : 'hidden'
            }} disabled={submitting}>Add Card</button>
          </form>
        </>
      </div>
      <ToastContainer />
      {loading
        ? <div className='flex fixed inset-0 items-center justify-center bg-opacity-80 bg-white'>
          <div style={{ color: `#${buttonBackgroundColor}` }} className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent rounded-full dark:text-blue-500" role="status" aria-label="loading">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
        : null
      }
    </div>
  );
}

export default App;
