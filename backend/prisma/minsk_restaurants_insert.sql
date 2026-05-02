WITH owner_row AS (
  SELECT id FROM users WHERE email = 'owner@restaurants.by' LIMIT 1
)
INSERT INTO restaurants (
  id, name, description, address, cuisine, "imageUrl", latitude, longitude, "avgRating", "ownerId"
)
SELECT *
FROM (
  VALUES
    (101, 'ButterBro', 'Современное bistro с акцентом на сезонные продукты и авторскую подачу. Интерьер в теплых тонах создает клубную, камерную атмосферу.', 'ул. Комсомольская, 12, Минск', 'Европейская кухня', 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1400&q=80', 53.90418, 27.55676, 4.8, (SELECT id FROM owner_row)),
    (102, 'Simple', 'Лаконичный гастробар с сильной винной картой и элегантной open-kitchen зоной. Идеален для неспешных ужинов в центре города.', 'ул. Революционная, 7, Минск', 'Гастробар', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80', 53.90358, 27.54994, 4.7, (SELECT id FROM owner_row)),
    (103, 'Пена Дней', 'Концептуальный винный бар с камерным светом и продуманной подборкой редких позиций. Пространство для ценителей вкуса и диалога.', 'ул. Интернациональная, 25А, Минск', 'Винный бар', 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1400&q=80', 53.90541, 27.56053, 4.6, (SELECT id FROM owner_row)),
    (104, 'Grand Café', 'Классика fine dining с акцентом на французские техники и безупречный сервис. Просторный зал подчеркивает статус и премиальность.', 'ул. Ленина, 2, Минск', 'Французская кухня', 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1400&q=80', 53.89977, 27.56156, 4.9, (SELECT id FROM owner_row)),
    (105, 'Brioche', 'Городской формат brunch-all-day с изящной французской выпечкой и specialty coffee. Уютный интерьер с мягким дневным светом.', 'пр-т Победителей, 9, Минск', 'Французская пекарня и бранч', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80', 53.91423, 27.54052, 4.7, (SELECT id FROM owner_row)),
    (106, 'Bergamo', 'Итальянский ресторан с акцентом на региональные рецепты и домашнюю пасту. Баланс современного дизайна и теплой семейной атмосферы.', 'ул. Зыбицкая, 6, Минск', 'Итальянская кухня', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=80', 53.90599, 27.55884, 4.8, (SELECT id FROM owner_row)),
    (107, 'Charlie', 'Ресторан с театральной эстетикой и авторским меню от шефа. Подходит для знаковых встреч и вечерних событий.', 'пр-т Независимости, 46, Минск', 'Авторская европейская кухня', 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1400&q=80', 53.91674, 27.58482, 4.9, (SELECT id FROM owner_row)),
    (108, 'Falcone', 'Флагман итальянского формата с премиальной сервировкой и безупречной винной парой. Интерьер выдержан в стиле современной классики.', 'пр-т Победителей, 29, Минск', 'Итальянская кухня', 'https://images.unsplash.com/photo-1515669097368-22e68427d265?auto=format&fit=crop&w=1400&q=80', 53.92310, 27.52273, 4.8, (SELECT id FROM owner_row)),
    (109, 'Maroon', 'Премиальный стейк-хаус с акцентом на выдержанное мясо и огненную кухню. Интерьер выполнен в темных, благородных тонах.', 'ул. Киселева, 12, Минск', 'Стейк-хаус', 'https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&w=1400&q=80', 53.91112, 27.56768, 4.7, (SELECT id FROM owner_row)),
    (110, 'Le Cro Cro', 'Элегантное бистро с винтажными акцентами, легкой кухней и вниманием к деталям. Идеально для дневного city-ritual.', 'ул. Карла Маркса, 21, Минск', 'Французское бистро', 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=1400&q=80', 53.90184, 27.55973, 4.6, (SELECT id FROM owner_row)),
    (111, 'The View', 'Панорамный ресторан с видом на город и современным европейским меню. Пространство для торжественных ужинов и особых поводов.', 'ул. Немига, 5, Минск', 'Панорамный ресторан', 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1400&q=80', 53.90332, 27.54703, 4.8, (SELECT id FROM owner_row)),
    (112, 'SeaFoodBar Minsk', 'Городской seafood-бар с авторскими сетами и свежими продуктами. Контраст темного дерева и мягкого света формирует премиальную атмосферу.', 'ул. Интернациональная, 36, Минск', 'Морская кухня', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80', 53.90621, 27.56112, 4.7, (SELECT id FROM owner_row))
) AS v(id, name, description, address, cuisine, "imageUrl", latitude, longitude, "avgRating", "ownerId")
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  address = EXCLUDED.address,
  cuisine = EXCLUDED.cuisine,
  "imageUrl" = EXCLUDED."imageUrl",
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  "avgRating" = EXCLUDED."avgRating",
  "ownerId" = EXCLUDED."ownerId";
