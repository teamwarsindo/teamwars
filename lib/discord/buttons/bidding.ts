export function getBidButtons(isClosed: boolean = false) {
  return [
    {
      type: 1, // ActionRow
      components: [
        { type: 2, style: 1, label: "Bid Group A", custom_id: "btn_bid_A", disabled: isClosed },
        { type: 2, style: 3, label: "Bid Group B", custom_id: "btn_bid_B", disabled: isClosed }
      ]
    }
  ];
}

export function getBidModal(groupTarget: string, minAmount: number = 110000) {
  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  return {
    type: 9, // Modal Response
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
              label: `Nominal Bid (MINIMAL: ${formatRupiah(minAmount)})`,
              style: 1,
              placeholder: `Ketik angka tanpa titik, contoh: ${minAmount}`,
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
