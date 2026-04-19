import axios from 'axios';
import React from 'react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const session_id = searchParams.get('session_id');
    console.log(session_id);

    useEffect(()=>{
        if(session_id){
            axios.post(`${import.meta.env.VITE_API_URL}/payment-success`,{session_id})
        }
    },[session_id])
    return (
        <div>
            <h1>Payment Successful</h1>
        </div>
    );
};

export default PaymentSuccess;