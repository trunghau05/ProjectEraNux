Django
pip install django
pip show django
python -m django startproject "tên dự án"
pip install django-cors-headers
pip install mysqlclient
pip install djangorestframework drf-spectacular
pip show django-cors-headers
pip install djangorestframework
pip install google-genai
pip install mongoengine
pip install mongoengine dnspython
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
python manage.py startapp “chức năng”
---
Angular
ng new "tên dự án"
npm install -g @angular/cli
npm install @angular/router
ng add @angular/material
npm install @angular/cdk
npm install -g @openapitools/openapi-generator-cli
npm install axios
npm install
npm run start
ng build
ng serve
---
python manage.py spectacular --file openapi.json
openapi-generator-cli generate -i http://localhost:8000/api/schema/ -g typescript-angular -o src/app/apis --additional-properties=providedInRoot=true

