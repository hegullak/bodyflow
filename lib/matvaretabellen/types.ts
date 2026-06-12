export type MatvaretabellenFood = {
  foodId: number;
  foodName: string;
  searchKeywords?: string[];
  calories?: {
    quantity: number;
    unit: string;
  };
};

export type MatvaretabellenFoodsResponse = {
  foods: MatvaretabellenFood[];
  locale: string;
};
