;; Constants
(define-constant STATUS-UNKNOWN u0)
(define-constant STATUS-FILLED u1)
(define-constant FILL-GRACE-PERIOD u300) ;; 5 minutes in seconds

;; Error codes
(define-constant ERR-INVALID-ORDER-ID (err u100))
(define-constant ERR-ALREADY-FILLED (err u101))
(define-constant ERR-DEADLINE-EXCEEDED (err u102))
(define-constant ERR-INCORRECT-AMOUNT (err u103))
(define-constant ERR-TRANSFER-FAILED (err u104))

;; Data maps
(define-map order-status (buff 32) uint)

;; Read-only functions
(define-read-only (get-order-status (order-id (buff 32)))
    (default-to STATUS-UNKNOWN (map-get? order-status order-id))
)

;; Public functions
(define-public (fill 
    (order-id (buff 32))
    (sender principal)
    (token-in principal)
    (amount-in uint)
    (amount-out uint)
    (recipient principal)
    (solver-origin-address principal)
    (fill-deadline uint))
    
    (let (
        ;; Compute orderId untuk validasi
        (computed-order-id (sha256 (concat 
            (concat (concat (concat (concat (concat
                (unwrap-panic (principal-to-buffer sender))
                (unwrap-panic (principal-to-buffer token-in)))
                (uint-to-buffer amount-in))
                (uint-to-buffer amount-out))
                (unwrap-panic (principal-to-buffer recipient)))
                (uint-to-buffer fill-deadline))
        )))
        (current-status (get-order-status order-id))
    )
    
    ;; Validations
    (asserts! (is-eq computed-order-id order-id) ERR-INVALID-ORDER-ID)
    (asserts! (is-eq current-status STATUS-UNKNOWN) ERR-ALREADY-FILLED)
    (asserts! (<= block-height (+ fill-deadline FILL-GRACE-PERIOD)) ERR-DEADLINE-EXCEEDED)
    (asserts! (is-eq (stx-get-balance tx-sender) amount-out) ERR-INCORRECT-AMOUNT)
    
    ;; Update status
    (map-set order-status order-id STATUS-FILLED)
    
    ;; Transfer STX to recipient
    (try! (stx-transfer? amount-out tx-sender recipient))
    
    ;; Emit event via print
    (print {
        event: "order-filled",
        order-id: order-id,
        solver: tx-sender,
        token-in: token-in,
        amount-in: amount-in,
        amount-out: amount-out,
        recipient: recipient,
        solver-origin-address: solver-origin-address,
        fill-deadline: fill-deadline
    })
    
    (ok true)
    )
)

;; Helper functions
(define-private (uint-to-buffer (value uint))
    ;; Simplified - in production you'd need proper encoding
    (buff-from-uint-be value)
)

(define-private (principal-to-buffer (addr principal))
    ;; Returns optional buff, need to handle properly
    (some (unwrap-panic (to-consensus-buff? addr)))
)
