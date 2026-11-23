from PIL import Image, ImageDraw

im = Image.open('public/images/financial-freedom-banner.jpg')
w, h = im.size

# 1. First, crop off the black bezel on the right
# Let's inspect where the black edge starts
crop_w = 998
for x in range(w - 1, 0, -1):
    r, g, b = im.getpixel((x, h // 2))[:3]
    if r > 100 and g > 100: # inside content
        crop_w = x - 2
        break

print(f"Cropping width from {w} to {crop_w}")
im_cropped = im.crop((0, 0, crop_w, h))
cw, ch = im_cropped.size

# 2. In top-right area (x from 580 to cw, y from 0 to 125):
# Fill with the smooth sage gradient from (580, 0) and surrounding area
draw = ImageDraw.Draw(im_cropped)

# Let's sample colors along y from 0 to 130 at x=560
# And at y=125 from x=580 to cw to create a perfectly seamless blend
col_left = im_cropped.getpixel((570, 60))[:3]
print("Left sample color:", col_left)

# Fill the top-right box where sun, bell, and Rudi are (x: 580 to cw, y: 0 to 135)
# Let's blend from top to bottom
for y in range(135):
    # Sample color from x=560 at this y
    base_col = im_cropped.getpixel((560, y))[:3]
    for x in range(580, cw):
        # subtle gradient towards right
        factor = (x - 580) / max(1, (cw - 580))
        # background in the original image is slightly lighter towards top-right
        r = int(base_col[0] + (245 - base_col[0]) * factor * 0.4)
        g = int(base_col[1] + (248 - base_col[1]) * factor * 0.4)
        b = int(base_col[2] + (242 - base_col[2]) * factor * 0.4)
        im_cropped.putpixel((x, y), (r, g, b))

# Apply a gentle blur/feather along the border y=130-135 and x=575-585
im_cropped.save('public/images/financial-freedom-banner-clean.jpg', quality=95)
print("Saved cleaned image to public/images/financial-freedom-banner-clean.jpg successfully!")
