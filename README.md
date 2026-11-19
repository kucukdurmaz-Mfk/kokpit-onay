# kokpit-onay

Akademik Kokpit'in parmak izi onay penceresi. Kokpit bu sayfayı küçük bir pencerede açar; sayfa cihazın kendi doğrulayıcısıyla (Touch ID, Face ID, Windows Hello ya da cihaz şifresi) bir anahtar tanımlar ya da onay özetini imzalar ve sonucu yalnızca kendisini açan Kokpit penceresine geri verir.

- Sayfa hiçbir veri saklamaz ve dışarıya göndermez; kişisel veri içermez.
- Özel anahtar cihazdan çıkmaz; Kokpit'te yalnızca açık anahtar saklanır.
- Sayfanın içeriği Kokpit ve görevler tarafından parmak iziyle (SHA-256) denetlenir; değişirse imzalar reddedilir.
