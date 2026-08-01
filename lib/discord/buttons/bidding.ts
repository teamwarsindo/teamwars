export function getBidButtons(isClosed: boolean = false) {
  return [
    {
      type: 1, // ActionRow
      components: [
        { type: 2, style: 1, label: "Bid Group A", custom_id: "btn_bid_A", disabled: isClosed },
        { type: 2, style: 3, label: "Bid Group B", custom_id: "btn_bid_B", disabled: isClosed },
        { type: 2, style: 2, label: "Bid Keduanya", custom_id: "btn_bid_BOTH", disabled: isClosed }
      ]
    }
  ];
}

export function getBidModal(groupTarget: string) {
  if (groupTarget === "BOTH") {
    return {
      type: 9, // Modal Response
      data: {
        custom_id: "modal_bid_BOTH",
        title: "Form Bidding Group A & B",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "input_division_name_a",
                label: "Nama Divisi Pilihan Group A",
                style: 1,
                placeholder: "Contoh: DL Aja Sampe 260k",
                required: true,
                max_length: 50
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "input_division_name_b",
                label: "Nama Divisi Pilihan Group B",
                style: 1,
                placeholder: "Contoh: Hasil Bidding Prizepool",
                required: true,
                max_length: 50
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "input_bid_amount",
                label: "Nominal Bid Masing-Masing (Min Rp100.000)",
                style: 1,
                placeholder: "Contoh: 110000",
                required: true,
                min_length: 6,
                max_length: 10
              }
            ]
          }
        ]
      }
    };
  }

  return {
    type: 9,
    data: {
      custom_id: `modal_bid_${groupTarget}`,
      title: `Form Bidding Group ${groupTarget}`,
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: "input_division_name",
              label: "Nama Divisi Pilihan",
              style: 1,
              placeholder: "Contoh: DL Aja Sampe 260k",
              required: true,
              max_length: 50
            }
          ]
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: "input_bid_amount",
              label: "Nominal Bid (Kelipatan Rp10.000)",
              style: 1,
              placeholder: "Contoh: 100000",
              required: true,
              min_length: 6,
              max_length: 10
            }
          ]
        }
      ]
    }
  };
}

/**
 * Tombol Konfirmasi Ephemeral [ Yakin / Batal ]
 */
export function getConfirmButtons(pendingId: string) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3, // Green
          label: "Ya, Saya Yakin",
          custom_id: `confirm_bid_yes_${pendingId}`
        },
        {
          type: 2,
          style: 4, // Red
          label: "Batal",
          custom_id: `confirm_bid_no_${pendingId}`
        }
      ]
    }
  ];
}
