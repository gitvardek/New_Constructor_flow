//@ts-nocheck
export class TechnologMethods {
    formReview = {}

    addInputTechnique = function () {
        var size = 0, key;
        for (key in this.formTech.technique) {
            if (this.formTech.technique.hasOwnProperty(key)) size++;
        }

        this.formTech.technique[size] = '';
        this.$applyAsync();
    }

    showFormTech = function (id) {
        this.clearForm(id);

        $('#techForm .message').html('');
        $('#techForm .message').hide();

        $("#open_project").modal("hide");
        $("#techForm").modal();

        var arrType = ['sketch', 'photoRoom', 'metering'];
        var fileUpDropArr = {};

        for (var i in arrType) {
            if (this.arrIdInputFile[arrType[i]] === undefined) {
                fileUpDropArr[arrType[i]] = fileUp.create({
                    url: '/upload/tmp',
                    input: arrType[i],
                    queue: arrType[i] + '-queue',
                    dropzone: arrType[i] + '-dropzone',
                    autostart: false,
                    sizeLimit: 20048576,
                    lang: 'ru',
                    onSelect: function (file) {

                        var format = [
                            'application/pdf',
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            'text/plain',
                            'application/msword',
                            'application/rtf',
                            'image/jpeg',
                            'image/png',
                            'image/bmp',
                        ];

                        if (format.indexOf(file.type) == -1) {
                            alert('Формат файла "' + file.name + '" невозможно загрузить.');
                            return false;
                        }
                    },
                })

                this.arrIdInputFile[arrType[i]] = fileUpDropArr[arrType[i]].getId();
            } else {
                fileUpDropArr[arrType[i]] = fileUp.get(this.arrIdInputFile[arrType[i]]);
                fileUpDropArr[arrType[i]].removeAll();
            }
        }

        setTimeout(() => {
            $("body").addClass("modal-open")
        }, 1000);
    };

    submitTechForm = function () {

        var f = document.querySelector("#formTech");
        var formData = new FormData(f);

        this.techFomrError = {}
        var fileUpDrop = {}

        for (var i in this.arrIdInputFile) {
            if (i == 'comments') continue;
            fileUpDrop[i] = fileUp.get(this.arrIdInputFile[i]);

            for (var f in fileUpDrop[i].getFiles()) {
                formData.append(i + '[]', fileUpDrop[i].getFiles()[f]['_file']);
            }

        }

        $.ajax({
            url: '/api/constructor/formtech/sendform/',
            method: 'post',
            processData: false,
            contentType: false,
            data: formData,
            success: function (data) {

                if (data.DATA.error !== undefined) {
                    this.techFomrError = data.DATA.error;
                    var textError = '';
                    for (let e in data.DATA.error) {
                        textError += '<span>' + data.DATA.error[e]['text'] + '</span>';
                    }
                    $('#techForm .message').removeClass('success');
                    $('#techForm .message').addClass('error');
                    $('#techForm .message').html(textError);
                    $('#techForm .message').show();
                } else {
                    $('#techForm .message').removeClass('error');

                    self.alert("Заявка успешно отправлена", "success");
                    $('#techForm').modal("hide");

                    this.clearForm();
                }

                this.$applyAsync();

            }
        });

    }

    clearForm = function (id = false) {

        if (id == false) {
            this.formTech['phone'] = '';
            this.formTech['email'] = '';
        } else {
            this.formTech = {}
            this.formTech['id'] = id;
        }

        this.formTech['technique'] = {
            0: '',
            1: '',
            2: '',
        }

        this.$applyAsync();
    }

    technologist = function () {

        this.techList = {
            filter: 0,
            pager: 1,
        }

        $("#techList").modal();

        this.getTechList();
    }

    getTechList = function () {

        this.techList.loader = true;

        var formData = new FormData();

        if (this.techList === undefined)
            this.techList = {}

        formData.append("filter", this.techList.filter);
        formData.append("pager", this.techList.pager);

        $.ajax({
            url: '/api/technologist/main/GetList/',
            method: 'post',
            processData: false,
            contentType: false,
            data: formData,
            success: function (data) {

                this.techList.elements = data.DATA.items;
                this.techList.loader = false;
                //this.techList.nav = data.DATA.nav;
                this.$applyAsync();
            }
        });

    }

    setStatus = function (id, statusId, projectTechId = false, message = false, comments = false) {

        if (comments) {
            var f = document.querySelector("#commentsForm");
            var formData = new FormData(f);

            var fileUpDrop = fileUp.get(this.arrIdInputFile['comments']);

            for (var f in fileUpDrop.getFiles()) {
                formData.append('comments[]', fileUpDrop.getFiles()[f]['_file']);
            }
        } else {
            var formData = new FormData();
        }

        formData.append("id", id);
        formData.append("statusId", statusId);

        if (projectTechId != false)
            formData.append("projectId", projectTechId);

        if (message != false)
            formData.append("message", message);

        $.ajax({
            url: '/api/technologist/main/SetStatus/',
            method: 'post',
            processData: false,
            contentType: false,
            data: formData,
            success: function (data) {
                if (statusId == 'C10:PREPAYMENT_INVOIC' || statusId == 'C10:1') {
                    this.formReview['result'] = data.DATA;

                    if (this.formReview.result.success) {
                        self.alert("Успешно отправлено на проверку", "success");
                        $('#review').modal("hide");
                    }

                    if (this.formReview.result.success) this.getTechList();
                } else {
                    this.getTechList();
                }
                this.$applyAsync();
            }
        });
    }

    openModalSTD = function (elem, statusId) {

        $("#review").modal();
        this.formReview = {}
        this.formReview.id = elem.id;
        this.formReview.statusId = statusId;
        if (this.arrIdInputFile['comments'] === undefined) {
            var fileUpDrop = fileUp.create({
                url: '/upload/tmp',
                input: 'comments',
                queue: 'comments-queue',
                dropzone: 'comments-dropzone',
                autostart: false,
                sizeLimit: 20048576,
                lang: 'ru',
                onSelect: function (file) {

                    var format = [
                        'application/pdf',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'text/plain',
                        'application/msword',
                        'application/rtf',
                        'image/jpeg',
                        'image/png',
                        'image/bmp',
                    ];

                    if (format.indexOf(file.type) == -1) {
                        alert('Формат файла "' + file.name + '" невозможно загрузить.');
                        return false;
                    }
                },
            })

            this.arrIdInputFile['comments'] = fileUpDrop.getId();
        } else {
            fileUpDrop = fileUp.get(this.arrIdInputFile['comments']);
            fileUpDrop.removeAll();
        }
    }

    sendToDesigner = function () {

        this.setStatus(
            this.formReview.id,
            this.formReview.statusId,
            this.formReview.projectTechId,
            this.formReview.message,
            true
        );
    }

    openModalComments = function (id) {
        $('#commentsList').modal();
        //this.formComments = {}
        //this.formComments['comments'] = comments;

        $('#commentsList').on('hide.bs.modal', function (e) {
            setTimeout(() => {
                $("body").addClass("modal-open")
            }, 1000);
        })
        var formData = new FormData();
        formData.append("id", id);

        $.ajax({
            url: '/api/technologist/main/GetComments/',
            method: 'post',
            processData: false,
            contentType: false,
            data: formData,
            success: function (data) {
                this.formComments = {}
                this.formComments['comments'] = data.DATA;
                this.$applyAsync();
            }
        });
    }

    openModalOrder = function (id) {
        $('#techList').modal("hide");

        setTimeout(() => {
            this.OpenProject(id);
        }, 1000)

        setTimeout(() => {
            self.getBasket();
            /* Муртазин, фикс корзины. Принудительное открытие модального окна */
            $(".modal-backdrop").modal();
            $("#cart").modal()
        }, 5000)
    }

    uploadProjectTech = function (id) {
        this.OpenProject(id);
        $('#techList').modal('hide');
    }
}