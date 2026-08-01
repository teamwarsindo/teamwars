export function getBidButtons(isClosed: boolean = false) {
  return [
    {
      type: 1, // ActionRow
      components: [
        {
          type: 2,
          style: 1, // Primary (Blue)
          label: "Bid Group A",
          custom_id: "btn_bid_A",
          disabled: isClosed
        },
        {
          type: 2,
          style: 3, // Success (Green)
          label: "Bid Group B",
          custom_id: "btn_bid_B",
          disabled: isClosed
        },
        {
          type: 2,
          style: 2, // Secondary (Grey)
          label: "Bid Keduanya",
          custom_id: "btn_bid_BOTH",
          disabled: isClosed
        }
      ]
    }
  ];
}

export function getBidModal(groupTarget: string) {
  const groupLabel = groupTarget === "BOTH" ? "Group A & B" : `Group ${groupTarget}`;

  return {
    type: 9, // Modal Response
    data: {
      custom_id: `modal_bid_${groupTarget}`,
      title: `Form Bidding ${groupLabel}`,
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
