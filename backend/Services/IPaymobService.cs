using elmanassa.DTOs;

namespace elmanassa.Services
{
    public interface IPaymobService
    {
        /// <summary>
        /// Creates a Paymob payment intention and returns the unified checkout URL.
        /// Also persists a pending Order + PaymentTransaction.
        /// </summary>
        Task<PaymobPaymentResponseDTO> CreatePaymentAsync(Guid userId, PaymobCreatePaymentDTO dto);

        /// <summary>
        /// Verifies HMAC and updates Order/PaymentTransaction status from server callback.
        /// </summary>
        Task ProcessServerCallbackAsync(System.Text.Json.JsonElement payload, string receivedHmac);

        /// <summary>Computes HMAC-SHA512 over concatenated field string.</summary>
        string ComputeHmacSHA512(string data, string secret);
    }
}
