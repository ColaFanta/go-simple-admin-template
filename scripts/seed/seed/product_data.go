package seed

import "fantacode/ecomm/internal/biz/dao/model"

// AppleProducts returns a declarative list of products to seed.
// Prices are in cents.
func AppleProducts() []model.Product {
	const usd = "USD"
	const cny = "CNY"
	const hkd = "HKD"

	const whUS = "WH-US-1"
	const whCN = "WH-CN-1"
	const whHK = "WH-HK-1"

	prices := func(usdCents uint64) []model.SkuPrice {
		return []model.SkuPrice{
			{Price: usdCents, Currency: usd},
			{Price: usdCents * 72 / 10, Currency: cny},
			{Price: usdCents * 78 / 10, Currency: hkd},
		}
	}
	inv := func(usQty uint64) []model.Inventory {
		cnQty := usQty / 2
		if cnQty == 0 {
			cnQty = 1
		}
		hkQty := usQty / 3
		if hkQty == 0 {
			hkQty = 1
		}
		return []model.Inventory{
			{Warehouse: whUS, Quantity: usQty},
			{Warehouse: whCN, Quantity: cnQty},
			{Warehouse: whHK, Quantity: hkQty},
		}
	}

	return []model.Product{
		{
			Name:        "iPhone 15 Pro",
			Description: "Apple iPhone 15 Pro with A17 Pro, Pro camera system, and Titanium design.",
			Brand:       "Apple",
			Category:    "phone",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-IP15P-128-NT-61",
					Prices:      prices(99900),
					Inventories: inv(25),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 99900, Currency: usd},
						Processor: "A17 Pro",
						Storage:   128,
						Color:     "Natural Titanium",
						Size:      "6.1-inch",
						Camera:    "48MP Main + Ultra Wide + Telephoto",
					},
				},
				{
					SkuCode:     "APL-IP15P-256-BT-61",
					Prices:      prices(109900),
					Inventories: inv(18),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 109900, Currency: usd},
						Processor: "A17 Pro",
						Storage:   256,
						Color:     "Blue Titanium",
						Size:      "6.1-inch",
						Camera:    "48MP Main + Ultra Wide + Telephoto",
					},
				},
			},
		},
		{
			Name:        "iPhone 15",
			Description: "Apple iPhone 15 with A16 Bionic, advanced dual-camera system, and USB-C.",
			Brand:       "Apple",
			Category:    "phone",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-IP15-128-BK-61",
					Prices:      prices(79900),
					Inventories: inv(30),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 79900, Currency: usd},
						Processor: "A16 Bionic",
						Storage:   128,
						Color:     "Black",
						Size:      "6.1-inch",
						Camera:    "48MP Main + Ultra Wide",
					},
				},
			},
		},
		{
			Name:        "MacBook Pro 14",
			Description: "Apple MacBook Pro 14-inch with Apple silicon, Liquid Retina XDR display.",
			Brand:       "Apple",
			Category:    "pc",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-MBP14-M3P-18-512",
					Prices:      prices(199900),
					Inventories: inv(10),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 199900, Currency: usd},
						Processor: "Apple M3 Pro",
						Ram:       18,
						Storage:   512,
					},
				},
				{
					SkuCode:     "APL-MBP14-M3M-36-1024",
					Prices:      prices(319900),
					Inventories: inv(6),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 319900, Currency: usd},
						Processor: "Apple M3 Max",
						Ram:       36,
						Storage:   1024,
					},
				},
			},
		},
		{
			Name:        "MacBook Air 13",
			Description: "Apple MacBook Air 13-inch with Apple silicon, thin-and-light design.",
			Brand:       "Apple",
			Category:    "pc",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-MBA13-M3-8-256",
					Prices:      prices(109900),
					Inventories: inv(14),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 109900, Currency: usd},
						Processor: "Apple M3",
						Ram:       8,
						Storage:   256,
					},
				},
				{
					SkuCode:     "APL-MBA13-M3-16-512",
					Prices:      prices(149900),
					Inventories: inv(9),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 149900, Currency: usd},
						Processor: "Apple M3",
						Ram:       16,
						Storage:   512,
					},
				},
			},
		},
		{
			Name:        "Mac mini",
			Description: "Apple Mac mini desktop with Apple silicon.",
			Brand:       "Apple",
			Category:    "pc",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-MMINI-M2-8-256",
					Prices:      prices(59900),
					Inventories: inv(20),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 59900, Currency: usd},
						Processor: "Apple M2",
						Ram:       8,
						Storage:   256,
					},
				},
			},
		},
		{
			Name:        "iPhone 15 Pro Max",
			Description: "Apple iPhone 15 Pro Max with A17 Pro, largest display, and best battery life.",
			Brand:       "Apple",
			Category:    "phone",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-IP15PM-256-NT-67",
					Prices:      prices(119900),
					Inventories: inv(22),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 119900, Currency: usd},
						Processor: "A17 Pro",
						Storage:   256,
						Color:     "Natural Titanium",
						Size:      "6.7-inch",
						Camera:    "48MP Main + Ultra Wide + Telephoto (5x)",
					},
				},
				{
					SkuCode:     "APL-IP15PM-512-BT-67",
					Prices:      prices(139900),
					Inventories: inv(15),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 139900, Currency: usd},
						Processor: "A17 Pro",
						Storage:   512,
						Color:     "Blue Titanium",
						Size:      "6.7-inch",
						Camera:    "48MP Main + Ultra Wide + Telephoto (5x)",
					},
				},
				{
					SkuCode:     "APL-IP15PM-1024-WT-67",
					Prices:      prices(159900),
					Inventories: inv(8),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 159900, Currency: usd},
						Processor: "A17 Pro",
						Storage:   1024,
						Color:     "White Titanium",
						Size:      "6.7-inch",
						Camera:    "48MP Main + Ultra Wide + Telephoto (5x)",
					},
				},
			},
		},
		{
			Name:        "iPhone 15 Plus",
			Description: "Apple iPhone 15 Plus with A16 Bionic, larger display, and all-day battery.",
			Brand:       "Apple",
			Category:    "phone",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-IP15PL-128-BL-67",
					Prices:      prices(89900),
					Inventories: inv(20),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 89900, Currency: usd},
						Processor: "A16 Bionic",
						Storage:   128,
						Color:     "Blue",
						Size:      "6.7-inch",
						Camera:    "48MP Main + Ultra Wide",
					},
				},
				{
					SkuCode:     "APL-IP15PL-256-PK-67",
					Prices:      prices(99900),
					Inventories: inv(16),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 99900, Currency: usd},
						Processor: "A16 Bionic",
						Storage:   256,
						Color:     "Pink",
						Size:      "6.7-inch",
						Camera:    "48MP Main + Ultra Wide",
					},
				},
			},
		},
		{
			Name:        "iPhone 14 Pro",
			Description: "Apple iPhone 14 Pro with A16 Bionic, Dynamic Island, and Always-On display.",
			Brand:       "Apple",
			Category:    "phone",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-IP14P-128-DP-61",
					Prices:      prices(89900),
					Inventories: inv(12),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 89900, Currency: usd},
						Processor: "A16 Bionic",
						Storage:   128,
						Color:     "Deep Purple",
						Size:      "6.1-inch",
						Camera:    "48MP Main + Ultra Wide + Telephoto",
					},
				},
				{
					SkuCode:     "APL-IP14P-256-SB-61",
					Prices:      prices(99900),
					Inventories: inv(10),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 99900, Currency: usd},
						Processor: "A16 Bionic",
						Storage:   256,
						Color:     "Space Black",
						Size:      "6.1-inch",
						Camera:    "48MP Main + Ultra Wide + Telephoto",
					},
				},
			},
		},
		{
			Name:        "iPhone 14",
			Description: "Apple iPhone 14 with A15 Bionic and advanced dual-camera system.",
			Brand:       "Apple",
			Category:    "phone",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-IP14-128-MN-61",
					Prices:      prices(69900),
					Inventories: inv(28),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 69900, Currency: usd},
						Processor: "A15 Bionic",
						Storage:   128,
						Color:     "Midnight",
						Size:      "6.1-inch",
						Camera:    "12MP Main + Ultra Wide",
					},
				},
				{
					SkuCode:     "APL-IP14-256-SL-61",
					Prices:      prices(79900),
					Inventories: inv(22),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 79900, Currency: usd},
						Processor: "A15 Bionic",
						Storage:   256,
						Color:     "Starlight",
						Size:      "6.1-inch",
						Camera:    "12MP Main + Ultra Wide",
					},
				},
			},
		},
		{
			Name:        "iPhone SE",
			Description: "Apple iPhone SE with A15 Bionic in a compact design.",
			Brand:       "Apple",
			Category:    "phone",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-IPSE-64-MN-47",
					Prices:      prices(42900),
					Inventories: inv(35),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 42900, Currency: usd},
						Processor: "A15 Bionic",
						Storage:   64,
						Color:     "Midnight",
						Size:      "4.7-inch",
						Camera:    "12MP Wide",
					},
				},
				{
					SkuCode:     "APL-IPSE-128-RD-47",
					Prices:      prices(47900),
					Inventories: inv(30),
					SkuSpecPhone: &model.SkuSpecPhone{
						SkuSpec:   model.SkuSpec{BasePrice: 47900, Currency: usd},
						Processor: "A15 Bionic",
						Storage:   128,
						Color:     "Red",
						Size:      "4.7-inch",
						Camera:    "12MP Wide",
					},
				},
			},
		},
		{
			Name:        "MacBook Pro 16",
			Description: "Apple MacBook Pro 16-inch with Apple silicon, stunning performance.",
			Brand:       "Apple",
			Category:    "pc",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-MBP16-M3P-18-512",
					Prices:      prices(249900),
					Inventories: inv(8),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 249900, Currency: usd},
						Processor: "Apple M3 Pro",
						Ram:       18,
						Storage:   512,
					},
				},
				{
					SkuCode:     "APL-MBP16-M3M-36-1024",
					Prices:      prices(349900),
					Inventories: inv(5),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 349900, Currency: usd},
						Processor: "Apple M3 Max",
						Ram:       36,
						Storage:   1024,
					},
				},
				{
					SkuCode:     "APL-MBP16-M3M-48-2048",
					Prices:      prices(449900),
					Inventories: inv(3),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 449900, Currency: usd},
						Processor: "Apple M3 Max",
						Ram:       48,
						Storage:   2048,
					},
				},
			},
		},
		{
			Name:        "MacBook Air 15",
			Description: "Apple MacBook Air 15-inch with Apple silicon and spacious display.",
			Brand:       "Apple",
			Category:    "pc",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-MBA15-M3-8-256",
					Prices:      prices(129900),
					Inventories: inv(12),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 129900, Currency: usd},
						Processor: "Apple M3",
						Ram:       8,
						Storage:   256,
					},
				},
				{
					SkuCode:     "APL-MBA15-M3-16-512",
					Prices:      prices(169900),
					Inventories: inv(8),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 169900, Currency: usd},
						Processor: "Apple M3",
						Ram:       16,
						Storage:   512,
					},
				},
			},
		},
		{
			Name:        "iMac 24",
			Description: "Apple iMac 24-inch with Apple silicon and vibrant 4.5K Retina display.",
			Brand:       "Apple",
			Category:    "pc",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-IMAC24-M3-8-256",
					Prices:      prices(129900),
					Inventories: inv(10),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 129900, Currency: usd},
						Processor: "Apple M3",
						Ram:       8,
						Storage:   256,
					},
				},
				{
					SkuCode:     "APL-IMAC24-M3-16-512",
					Prices:      prices(169900),
					Inventories: inv(7),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 169900, Currency: usd},
						Processor: "Apple M3",
						Ram:       16,
						Storage:   512,
					},
				},
			},
		},
		{
			Name:        "Mac Studio",
			Description: "Apple Mac Studio with powerful Apple silicon for demanding workflows.",
			Brand:       "Apple",
			Category:    "pc",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-MSTUD-M2M-32-512",
					Prices:      prices(199900),
					Inventories: inv(6),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 199900, Currency: usd},
						Processor: "Apple M2 Max",
						Ram:       32,
						Storage:   512,
					},
				},
				{
					SkuCode:     "APL-MSTUD-M2U-64-1024",
					Prices:      prices(399900),
					Inventories: inv(3),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 399900, Currency: usd},
						Processor: "Apple M2 Ultra",
						Ram:       64,
						Storage:   1024,
					},
				},
			},
		},
		{
			Name:        "Mac Pro",
			Description: "Apple Mac Pro with extreme performance and expansion capabilities.",
			Brand:       "Apple",
			Category:    "pc",
			Skus: []model.Sku{
				{
					SkuCode:     "APL-MPRO-M2U-64-1024",
					Prices:      prices(699900),
					Inventories: inv(2),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 699900, Currency: usd},
						Processor: "Apple M2 Ultra",
						Ram:       64,
						Storage:   1024,
					},
				},
				{
					SkuCode:     "APL-MPRO-M2U-128-2048",
					Prices:      prices(899900),
					Inventories: inv(1),
					SkuSpecPc: &model.SkuSpecPc{
						SkuSpec:   model.SkuSpec{BasePrice: 899900, Currency: usd},
						Processor: "Apple M2 Ultra",
						Ram:       128,
						Storage:   2048,
					},
				},
			},
		},
	}
}
