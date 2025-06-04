var editor1cfg = {}
	editor1cfg.toolbar = editor1cfg.toolbarMobile = "mytoolbar";
	editor1cfg.toolbar_mytoolbar = "{html2pdf,insertemoji,insertcode,insertgallery,inserttemplate}";

var editor1 = new RichTextEditor("#editor", { editorResizeMode: "none" },editor1cfg);