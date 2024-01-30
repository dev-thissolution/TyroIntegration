import { InfoCircleFilled } from '@ant-design/icons';
import * as React from 'react';
import { createRef, useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import loaderGif from './loader.gif';

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

  },
};

const tyroJSRef = createRef();

const loaderStyle = {
  display: 'flex',
  width: '100%',
  height: '100%',
  backgroundColor: '#f5f6f7',
  opacity: 0.8,
  position: 'fixed',
  zIndex: 99,
  justifyContent: 'center',
  alignItems: 'center'
};

const buttonStyle = {
  borderRadius: '5px',
  width: '100%',
  backgroundColor: '#9E8CCC',
  border: '0px',
  color: 'white',
  padding: '10px',
  marginTop: '10px',
  fontSize: '20px',
};

const App = () => {
  const [configuration, setConfiguration] = useState(defaultSettings);

  const [error, setError] = useState({});
  const [loading, setLoading] = useState(true);
  const [libraryReady, setLibraryReady] = useState(false);
  const [fetchingPaySecret, setFetchingPaySecret] = useState(false);
  const [payRequestReady, setPayRequestReady] = useState(false);
  const [payFormReady, setPayFormReady] = useState(false);
  const [submittingOverlay, setSubmittingOverlay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payComplete, setPayComplete] = useState(false);

  const { paySecret, theme, styleProps, options } = configuration;
  let search = window.location.search;
  let params = new URLSearchParams(search);
  let paySecretValue = params.get('paySecretValue');

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
        liveMode: false,
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
      setPayComplete(payRequest);
      setSubmitting(false);
      setLoading(false);
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
        {payComplete ? (
          <>Payment has been completed.</>
        ) : (
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
        )}

      </div>
      <ToastContainer />
      {loading ? <div style={loaderStyle}>
        <img src={loaderGif} alt='loader' />
      </div> : ''
      }
    </div>
  );
}

export default App;
